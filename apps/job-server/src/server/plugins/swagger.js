import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import config from '../config/index.js';

async function swaggerPlugin(fastify) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Job Automation API',
        description: 'API for job search, application tracking, and AI matching',
        version: config.version,
        contact: {
          name: 'jclee',
          url: 'https://resume.jclee.me/job',
        },
      },
      servers: [
        {
          url: 'https://resume.jclee.me/job',
          description: 'Production',
        },
        {
          url: 'http://localhost:3456',
          description: 'Development',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'applications', description: 'Job application management' },
        { name: 'search', description: 'Job search' },
        { name: 'stats', description: 'Statistics and reports' },
        { name: 'ai', description: 'AI matching and analysis' },
        { name: 'slack', description: 'Slack integration' },
        { name: 'system', description: 'System health and metrics' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session',
          },
          csrfToken: {
            type: 'apiKey',
            in: 'header',
            name: 'X-CSRF-Token',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          Application: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              position: { type: 'string' },
              company: { type: 'string' },
              status: {
                type: 'string',
                enum: ['saved', 'applied', 'interview', 'offer', 'rejected'],
              },
              source: { type: 'string' },
              sourceUrl: { type: 'string' },
              matchScore: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Job: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              description: { type: 'string' },
              source: { type: 'string' },
              url: { type: 'string' },
              matchScore: { type: 'number' },
            },
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
  });

  fastify.log.info('Swagger UI available at /docs');
}

export default fp(swaggerPlugin, { name: 'swagger' });
