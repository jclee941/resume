import { z } from 'zod';

export const applicationPriorityWideSchema = z.enum(['low', 'medium', 'high']);
