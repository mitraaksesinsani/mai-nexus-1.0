'use client';

import React from 'react';
import { CheckCircle2, Clock, XCircle, UserCheck, ArrowRight, PackageCheck, AlertCircle, FileText } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  stepName: string;
  approverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  actionAt?: string | null;
  createdAt?: string;
  approverName?: string;
  approverRole?: string;
  approverEmail?: string;
}

interface RfcApprovalStepperProps {
  rfcStatus: string;
  currentStepOrder?: number;
  requestor?: {
    name?: string;
    role?: string;
  };
  createdAt?: string;
  approvals?: ApprovalStep[];
  takerName?: string | null;
  takerDate?: string | null;
  evidenceDocument?: string | null;
  currentUserId?: string;
  className?: string;
}

export default function RfcApprovalStepper({
  rfcStatus,
  currentStepOrder = 1,
  requestor,
  createdAt,
  approvals = [],
  takerName,
  takerDate,
  evidenceDocument,
  currentUserId,
  className
}: RfcApprovalStepperProps) {
  const isRejected = rfcStatus === 'REJECTED';
  const isCompleted = rfcStatus === 'COMPLETED';
  const isFullyApproved = rfcStatus === 'APPROVED' || isCompleted;

  return (
    <div className={cn('bg-card border border-border rounded-xl p-5 shadow-sm space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Approval & Fulfillment Workflow
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hierarchical verification process from submission to warehouse material dispatch
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRejected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              Request Rejected
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <PackageCheck className="h-3.5 w-3.5" />
              Fully Dispatched & Completed
            </span>
          ) : isFullyApproved ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved • Ready for Pickup
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              Waiting Level {currentStepOrder} Approval
            </span>
          )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative pt-1">
        {/* STEP 1: Submission */}
        <div className="relative p-3.5 rounded-lg border bg-muted/20 flex flex-col justify-between border-green-200 dark:border-green-800/40">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Submission
              </span>
              <p className="text-sm font-semibold truncate text-foreground">
                {requestor?.name || 'Requestor'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {requestor?.role || 'User'}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Submitted</span>
            <span>{formatDate(createdAt)}</span>
          </div>
        </div>

        {/* Dynamic Tier Approvals (Level 1 & Level 2 / N-tier) */}
        {approvals.length > 0 ? (
          approvals.map((app) => {
            const isCurrentActive = rfcStatus === 'WAITING_APPROVAL' && app.stepOrder === currentStepOrder;
            const isStepApproved = app.status === 'APPROVED';
            const isStepRejected = app.status === 'REJECTED';
            const isWaitingPrior = app.stepOrder > currentStepOrder && rfcStatus === 'WAITING_APPROVAL';
            const isAssignedToCurrent = currentUserId && app.approverId === currentUserId;

            return (
              <div
                key={app.id || app.stepOrder}
                className={cn(
                  'relative p-3.5 rounded-lg border flex flex-col justify-between transition-colors',
                  isStepApproved && 'bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800/40',
                  isStepRejected && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40',
                  isCurrentActive && 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/40',
                  isWaitingPrior && 'bg-muted/10 border-border/60 opacity-70'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs',
                      isStepApproved && 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
                      isStepRejected && 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
                      isCurrentActive && 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
                      isWaitingPrior && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isStepApproved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isStepRejected ? (
                      <XCircle className="h-4 w-4" />
                    ) : isCurrentActive ? (
                      <Clock className="h-4 w-4 animate-spin" style={{ animationDuration: '4s' }} />
                    ) : (
                      <span>{app.stepOrder}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        {app.stepName || `Level ${app.stepOrder} Approval`}
                      </span>
                      {isAssignedToCurrent && isCurrentActive && (
                        <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate text-foreground">
                      {app.approverName || 'Assigned Approver'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.approverRole || 'Approver'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-medium">
                      {isStepApproved ? (
                        <span className="text-green-600 dark:text-green-400">Approved</span>
                      ) : isStepRejected ? (
                        <span className="text-red-600 dark:text-red-400">Rejected</span>
                      ) : isCurrentActive ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Waiting Action</span>
                      ) : (
                        <span>Upcoming</span>
                      )}
                    </span>
                    <span>{app.actionAt ? formatDate(app.actionAt) : '-'}</span>
                  </div>
                  {app.notes && (
                    <p className="text-xs text-muted-foreground italic bg-background/50 p-1 rounded border border-border/40 truncate" title={app.notes}>
                      "{app.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Fallback jika tidak ada data sub-approvals (RFC legacy) */
          <div className="relative p-3.5 rounded-lg border bg-muted/10 border-border/60 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                1
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification
                </span>
                <p className="text-sm font-semibold text-foreground">General Approval</p>
                <p className="text-xs text-muted-foreground">Direct Authorization</p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              {rfcStatus}
            </div>
          </div>
        )}

        {/* STEP 4: Warehouse Material Dispatch */}
        <div
          className={cn(
            'relative p-3.5 rounded-lg border flex flex-col justify-between transition-colors',
            isCompleted && 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40',
            !isCompleted && isFullyApproved && 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40',
            !isFullyApproved && 'bg-muted/10 border-border/60 opacity-60'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs',
                isCompleted && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
                !isCompleted && isFullyApproved && 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
                !isFullyApproved && 'bg-muted text-muted-foreground'
              )}
            >
              <PackageCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Warehouse Dispatch
              </span>
              <p className="text-sm font-semibold truncate text-foreground">
                {takerName ? takerName : isFullyApproved ? 'Ready for Pickup' : 'Warehouse Issuance'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isCompleted ? 'Materials Released' : isFullyApproved ? 'Awaiting Handover' : 'Pending Prior Approvals'}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isCompleted ? 'Handed Over' : 'Pickup Date'}</span>
            <span>{takerDate ? formatDate(takerDate) : isCompleted ? 'Completed' : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
