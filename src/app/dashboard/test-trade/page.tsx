'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTrades, getTradeAccounts } from '@/services/trades.service';
import {
  TRADE_OUTCOMES,
  TradeAccountRecord,
  TradeOutcome,
} from '@/types/trade.types';

export default function TestTradePage() {
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [account, setAccount] = useState('');
  const [marketId, setMarketId] = useState('test-market');
  const [outcome, setOutcome] = useState<TradeOutcome>('up');
  const [price, setPrice] = useState('0.5');
  const [amount, setAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    getTradeAccounts()
      .then((data) => {
        setAccounts(data);
        setAccount((current) => current || data[0]?.account || '');
      })
      .catch(() => setAccounts([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await createTrades([
        {
          marketId,
          account,
          outcome,
          price: Number(price),
          amount: Number(amount),
          timestamp: new Date().toISOString(),
        },
      ]);
      setMessage({
        type: 'success',
        text: `Thành công: đã insert ${result.inserted} trade.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Gửi trade test thất bại.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <Card>
        <CardContent>
          <form
            className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(280px,1fr)_180px_160px_160px_auto]"
            onSubmit={onSubmit}
          >
            <div className="grid gap-1">
              <Label>Account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((item) => (
                    <SelectItem key={item.id} value={item.account}>
                      {item.account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Market ID</Label>
              <Input
                value={marketId}
                onChange={(event) => setMarketId(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label>Outcome</Label>
              <Select
                value={outcome}
                onValueChange={(value) => setOutcome(value as TradeOutcome)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_OUTCOMES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === 'up' ? 'Up' : 'Down'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Price</Label>
              <Input
                value={price}
                type="number"
                min="0"
                step="0.01"
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label>Amount</Label>
              <Input
                value={amount}
                type="number"
                min="0.000001"
                step="0.000001"
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting || !account}>
              {submitting ? 'Sending' : 'Send'}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-2 rounded-md border px-3 py-2 text-xs ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
