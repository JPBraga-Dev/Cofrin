export const ok = (res, data, meta) => res.json(meta ? { data, meta } : { data });
export const notFound = (res, resource = 'Resource') => res.status(404).json({ error: { code: 'NOT_FOUND', message: `${resource} not found` } });
