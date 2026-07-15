import React from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusPill } from './StatusPill.jsx';

export function OrderCard({ order, compact = false, onOpenLabel = '查看工单' }) {
  return (
    <article className={['order-card', compact ? 'order-card--compact' : ''].filter(Boolean).join(' ')}>
      <div className="order-card__row order-card__row--top">
        <div className="order-card__identity">
          <h3>{order.plate}</h3>
          <p>{order.orderNo}</p>
        </div>
        <StatusPill tone={order.statusTone}>{order.statusLabel}</StatusPill>
      </div>

      <div className="order-card__row order-card__row--meta">
        <p>{order.customer}</p>
        <span>{order.phone}</span>
      </div>

      <p className="order-card__summary">{order.repairSummary}</p>

      {!compact && order.model ? <p className="order-card__model">{order.model}</p> : null}

      <div className="order-card__row order-card__row--footer">
        <div>
          <p className="order-card__amount">{order.amountLabel}</p>
          <p className="order-card__time">{order.updatedAt}</p>
        </div>
        <div className="order-card__actions">
          {order.actionLabel ? (
            <button type="button" className="order-card__action order-card__action--primary">
              {order.actionLabel}
            </button>
          ) : null}
          <button type="button" className="order-card__action">
            <span>{onOpenLabel}</span>
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
