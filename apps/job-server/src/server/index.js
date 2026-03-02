import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import config from './config/index.js';
import authPlugin from './plugins/auth.js';
import errorHandler from './middleware/error-handler.js';

import authRoutes from './routes/auth.js';
import applicationsRoutes from './routes/applications.js';
import searchRoutes from './routes/search.js';
import statsRoutes from './routes/stats.js';
import aiRoutes from './routes/ai.js';
import slackRoutes from './routes/slack.js';
import dashboardRoutes from './routes/dashboard.js';

import configRoutes from './routes/config.js';
import d1Routes from './routes/d1.js';
import autoApplyRoutes from './routes/auto-apply.js';
import analyticsRoutes from './routes/analytics.js';

const isDev = config.nodeEnv === 'development';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
      transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
    trustProxy: true,
    bodyLimit: config.limits.maxBodySize,
  });

  fastify.setErrorHandler(errorHandler);

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(null, config.corsOrigins[0]);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await fastify.register(fastifyCookie);

  await fastify.register(fastifyRateLimit, {
    max: config.limits.rateLimit.max,
    timeWindow: config.limits.rateLimit.timeWindow,
    skipOnError: true,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  });

  await fastify.register(authPlugin);

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Job Automation API',
        description: 'REST API for job search, application tracking, and auto-apply',
        version: '1.4.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local' },
        { url: 'https://resume.jclee.me/job', description: 'Production' },
      ],
      tags: [
        { name: 'Health', description: 'Service health' },
        { name: 'Applications', description: 'Job applications CRUD' },
        { name: 'Search', description: 'Job search' },
        { name: 'Stats', description: 'Statistics' },
        { name: 'AutoApply', description: 'Automated applications' },
        { name: 'Analytics', description: 'Success rate analysis' },
      ],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await fastify.register(fastifyStatic, {
    root: config.paths.public,
    prefix: '/',
    decorateReply: false,
  });

  // Root health endpoint (for consistency with resume.jclee.me)
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    uptime: process.uptime(),
  }));

  fastify.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    uptime: process.uptime(),
  }));

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(applicationsRoutes, { prefix: '/api/applications' });
  await fastify.register(searchRoutes, { prefix: '/api/search' });
  await fastify.register(statsRoutes, { prefix: '/api' });
  await fastify.register(aiRoutes, { prefix: '/api/ai' });
  await fastify.register(slackRoutes, { prefix: '/api/slack' });
  await fastify.register(dashboardRoutes, { prefix: '/api' });

  await fastify.register(configRoutes, { prefix: '/api/config' });
  await fastify.register(d1Routes, { prefix: '/api/d1' });
  await fastify.register(autoApplyRoutes, { prefix: '/api/auto-apply' });
  await fastify.register(analyticsRoutes);

  fastify.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.status(404).send({ error: 'Not found' });
    } else {
      reply.sendFile('index.html');
    }
  });

  return fastify;
}

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(
      `resume.jclee.me/job Backend v2.0.0 | http://localhost:${config.port} | ${config.nodeEnv}`
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

export { buildServer };
export default start;

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
