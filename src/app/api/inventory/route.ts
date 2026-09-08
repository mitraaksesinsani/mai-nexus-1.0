import { GET as getStocks } from './stocks/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return getStocks(request);
}
