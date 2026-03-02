function generateChatRoute(opts) {
  return `
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        try {
          if (!hasJsonContentType(request)) {
            return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
              status: 415,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          }

          const body = await request.json();
          const question = (body?.question || '').toString().trim();
          if (!question) {
            return new Response(JSON.stringify({ error: 'question is required' }), {
              status: 400,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          }

          if (question.length > 500) {
            return new Response(JSON.stringify({ error: 'question exceeds 500 characters' }), {
              status: 400,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          }

          const resumeData = JSON.parse(atob('${opts.resumeChatDataBase64}'));

          const normalize = (value) =>
            String(value || '')
              .toLowerCase()
              .replace(/[^a-z0-9가-힣\\s]/g, ' ')
              .replace(/\\s+/g, ' ')
              .trim();

          const toList = (value) => (Array.isArray(value) ? value : []);

          const localAnswer = (() => {
            const q = normalize(question);
            const experiences = toList(resumeData.resume);
            const projects = toList(resumeData.projects);
            const certs = toList(resumeData.certifications);
            const contact = resumeData.contact || {};

            if (/(experience|career|work|경력|경험|회사|업무)/.test(q) && experiences.length > 0) {
              const top = experiences
                .slice(0, 3)
                .map((item) => item.title + ' (' + item.period + ')')
                .join(', ');
              return 'Top experience: ' + top;
            }

            if (/(skill|stack|tech|기술|스킬|역량)/.test(q) && resumeData.skills) {
              const skillItems = Object.values(resumeData.skills)
                .flatMap((category) => toList(category?.items))
                .slice(0, 10)
                .map((item) => item.name)
                .join(', ');
              if (skillItems) {
                return 'Key skills: ' + skillItems;
              }
            }

            if (/(project|portfolio|프로젝트|사이드)/.test(q) && projects.length > 0) {
              const top = projects
                .slice(0, 3)
                .map((item) => item.title + ': ' + item.description)
                .join(' | ');
              return 'Featured projects: ' + top;
            }

            if (/(cert|certificate|자격증|인증)/.test(q) && certs.length > 0) {
              const active = certs.filter((cert) => cert.status === 'active').map((cert) => cert.name);
              return (
                'Certifications: ' +
                (active.length > 0 ? active : certs.map((cert) => cert.name)).slice(0, 8).join(', ')
              );
            }

            if (/(contact|email|phone|github|연락|이메일|전화)/.test(q) && contact.email) {
              return (
                'Contact info: email ' +
                contact.email +
                ', phone ' +
                (contact.phone || 'N/A') +
                ', github ' +
                (contact.github || 'N/A')
              );
            }

            return null;
          })();

          let answer = localAnswer;
          if (!answer && env?.GEMINI_API_KEY) {
            const ipHeader =
              request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
            const clientIp = ipHeader.split(',')[0].trim() || 'unknown';
            const aiRateLimitStateKey = '__resume_chat_ai_rate_limit_state__';
            const aiRateLimitState =
              globalThis[aiRateLimitStateKey] instanceof Map
                ? globalThis[aiRateLimitStateKey]
                : (globalThis[aiRateLimitStateKey] = new Map());

            const now = Date.now();
            const windowMs = 60 * 1000;
            const maxAiCallsPerMinute = 10;
            const previous = aiRateLimitState.get(clientIp) || { windowStart: now, count: 0 };
            const sameWindow = now - previous.windowStart < windowMs;
            const next = sameWindow
              ? { windowStart: previous.windowStart, count: previous.count + 1 }
              : { windowStart: now, count: 1 };
            aiRateLimitState.set(clientIp, next);

            if (aiRateLimitState.size > 1024) {
              for (const [trackedIp, state] of aiRateLimitState.entries()) {
                if (now - state.windowStart > windowMs * 2) {
                  aiRateLimitState.delete(trackedIp);
                }
              }
            }

            if (next.count <= maxAiCallsPerMinute) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);

              const systemPrompt =
                'You are a helpful assistant for Jaecheol Lee\\'s resume portfolio. ' +
                'Answer only questions directly related to the resume data. ' +
                'If a question is unrelated, say you can only answer resume-related questions ' +
                'about experience, skills, projects, certifications, and contact info. ' +
                'Do not invent facts and keep answers concise.';

              const contextJson = JSON.stringify(resumeData).slice(0, 2000);

              try {
                const aiResponse = await fetch(
                  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
                    env.GEMINI_API_KEY,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                      contents: [
                        {
                          parts: [
                            {
                              text:
                                systemPrompt +
                                '\\n\\nResume context JSON:\\n' +
                                contextJson +
                                '\\n\\nQuestion: ' +
                                question,
                            },
                          ],
                        },
                      ],
                      generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
                    }),
                  }
                );

                if (aiResponse.ok) {
                  const aiResult = await aiResponse.json();
                  const aiText = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (typeof aiText === 'string' && aiText.trim()) {
                    answer = aiText.trim();
                  }
                } else {
                  const aiErrorText = await aiResponse.text();
                  ctx.waitUntil(
                    logToElasticsearch(env, 'Gemini API non-OK response', 'WARN', {
                      path: '/api/chat',
                      method: 'POST',
                      status: aiResponse.status,
                      clientIp,
                      response: aiErrorText.slice(0, 300),
                    })
                  );
                }
              } catch (aiError) {
                const message = aiError instanceof Error ? aiError.message : String(aiError);
                ctx.waitUntil(
                  logToElasticsearch(env, 'Gemini API unavailable: ' + message, 'WARN', {
                    path: '/api/chat',
                    method: 'POST',
                    clientIp,
                  })
                );
              } finally {
                clearTimeout(timeoutId);
              }
            } else {
              ctx.waitUntil(
                logToElasticsearch(env, 'Gemini API rate limit exceeded', 'WARN', {
                  path: '/api/chat',
                  method: 'POST',
                  clientIp,
                })
              );
            }
          }

          if (!answer) {
            answer =
              'I can tell you about my experience, skills, projects, certifications, or contact info';
          }

          if (!localAnswer && !env?.GEMINI_API_KEY && env?.AI?.run) {
            try {
              const model = '${opts.aiModel}';
              const contextJson = JSON.stringify(resumeData);
              const systemPrompt =
                'You are a resume assistant for Jaecheol Lee. Answer only using the resume context. Keep answers concise and factual. ' +
                'If information is unavailable, say so and suggest asking about experience, skills, projects, certifications, or contact.\\n\\n' +
                'Resume context JSON:\\n' +
                contextJson;

              const aiResult = await env.AI.run(model, {
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: question },
                ],
                max_tokens: 320,
                temperature: 0.2,
              });

              const aiAnswer =
                aiResult?.response ||
                aiResult?.result ||
                aiResult?.text ||
                (Array.isArray(aiResult) ? aiResult[0] : null);

              if (!localAnswer && typeof aiAnswer === 'string' && aiAnswer.trim()) {
                answer = aiAnswer.trim();
              }
            } catch (aiError) {
              ctx.waitUntil(logToElasticsearch(env, 'Chat AI fallback: ' + aiError.message, 'WARN', {
                path: '/api/chat',
                method: 'POST',
              }));
            }
          }

          metrics.requests_success++;
          return new Response(JSON.stringify({ answer }), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        } catch (err) {
          metrics.requests_error++;
          ctx.waitUntil(logToElasticsearch(env, 'Chat route error: ' + err.message, 'ERROR', {
            path: '/api/chat',
            method: 'POST',
          }));
          return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      }`;
}

module.exports = {
  generateChatRoute,
};
