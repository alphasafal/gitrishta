import { handleShare } from '../src/server/share';

export const config = { runtime: 'edge' };

export default (req: Request) => handleShare(req, process.env.PUBLIC_URL);
