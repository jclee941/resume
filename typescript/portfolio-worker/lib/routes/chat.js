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

            return 'I can tell you about my experience, skills, projects, certifications, or contact info';
          })();

          let answer = localAnswer;
          if (env?.AI?.run) {
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

              if (typeof aiAnswer === 'string' && aiAnswer.trim()) {
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
