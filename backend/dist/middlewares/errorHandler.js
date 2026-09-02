import { ZodError } from 'zod';
export const errorHandler = (error, _req, res, _next) => { if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues.map(i => i.message).join(', ') } });
    return;
} console.error(error); res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }); };
