import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard/market-btc');
}
