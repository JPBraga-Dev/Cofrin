import type { Response } from 'express';
export const ok=(res:Response,data:unknown,meta?:Record<string,unknown>)=>res.json(meta?{data,meta}:{data});
export const notFound=(res:Response,resource='Resource')=>res.status(404).json({error:{code:'NOT_FOUND',message:`${resource} not found`}});
