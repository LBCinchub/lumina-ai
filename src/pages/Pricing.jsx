import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Copy, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SOLANA_ADDRESS = '2SYh5UjyGEVwCMTQrY5LJrGRfEAmU9MqXECRrAMsNK34';
const MONTHLY_PRICE = 99.99;

export default function Pricing() {
  const [copied, setCopied] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const subs = await base44.entities.UserSubscription.list();
        setSubscription(subs[0] || null);
      } catch (err) {
        console.error('Failed to load subscription:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSubscription();
  }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(SOLANA_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSubscribed = subscription?.subscription_status === 'active' && 
                       subscription?.subscription_expires_at && 
                       new Date(subscription.subscription_expires_at) > new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Plans
          </div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] mb-4">
            Unlock Lumina's full power.
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-xl mx-auto">
            Start free with 3 requests per month. Subscribe to Solana for unlimited access.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Free Plan */}
          <div className="rounded-2xl border border-border p-8 bg-card/40">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl tracking-tight mb-1">Free</h2>
                <p className="text-sm text-muted-foreground">Get started</p>
              </div>
            </div>
            <div className="mb-8">
              <div className="text-3xl font-medium mb-1">$0</div>
              <p className="text-sm text-muted-foreground">3 requests per month</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">3 monthly requests</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Personal context</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Document library</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full rounded-full" disabled>
              Your current plan
            </Button>
          </div>

          {/* Pro Plan */}
          <div className={cn(
            "rounded-2xl border-2 p-8 bg-card/60",
            isSubscribed ? "border-accent" : "border-border"
          )}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl tracking-tight mb-1">Pro</h2>
                <p className="text-sm text-muted-foreground">Unlimited power</p>
              </div>
              {isSubscribed && (
                <span className="text-[11px] uppercase tracking-[0.14em] bg-accent text-accent-foreground px-2.5 py-1 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="mb-8">
              <div className="text-3xl font-medium mb-1">${MONTHLY_PRICE}</div>
              <p className="text-sm text-muted-foreground">per month in Solana</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Unlimited requests</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Advanced context</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Priority processing</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">Document library</span>
              </li>
            </ul>
            {!isSubscribed ? (
              <Button className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                <Zap className="w-3.5 h-3.5 mr-2" />
                Upgrade to Pro
              </Button>
            ) : (
              <Button variant="outline" className="w-full rounded-full" disabled>
                Subscribed until {new Date(subscription.subscription_expires_at).toLocaleDateString()}
              </Button>
            )}
          </div>
        </div>

        {/* Solana Payment Info */}
        {!isSubscribed && (
          <div className="rounded-2xl border border-border bg-card/40 p-8">
            <div className="mb-6">
              <h3 className="font-serif text-lg tracking-tight mb-2">Send Solana Payment</h3>
              <p className="text-sm text-muted-foreground">
                Send exactly {MONTHLY_PRICE} USDC or equivalent SOL to the address below. Payment is processed instantly on the Solana blockchain.
              </p>
            </div>

            <div className="mb-6">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Wallet Address
              </div>
              <div className="flex items-center gap-2 bg-background rounded-lg px-4 py-3 border border-border">
                <code className="flex-1 text-sm font-mono text-foreground/80 break-all">
                  {SOLANA_ADDRESS}
                </code>
                <button
                  onClick={copyAddress}
                  className="shrink-0 p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                After sending, reply with your transaction hash or email <code className="text-foreground/60">mokhtartareksamara@gmail.com</code> to activate your subscription.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}