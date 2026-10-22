import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { AuditEvent, UserRole } from '../../types';

export class AuditService {
  public static log(params: {
    actorId?: string;
    actorRole?: UserRole | string;
    action: string;
    resourceType: string;
    resourceId?: string;
    outcome: 'success' | 'failure' | 'denied';
    ipAddress?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): AuditEvent {
    const event: AuditEvent = {
      id: uuidv4(),
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      outcome: params.outcome,
      ip_address: params.ipAddress,
      correlation_id: params.correlationId || uuidv4(),
      metadata: params.metadata || {},
      timestamp: new Date().toISOString(),
    };

    return db.insert('audit_events', event);
  }

  public static getEvents(filter?: {
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }) {
    let events = db.find('audit_events');
    if (filter?.resourceType) {
      events = events.filter((e) => e.resource_type === filter.resourceType);
    }
    if (filter?.resourceId) {
      events = events.filter((e) => e.resource_id === filter.resourceId);
    }
    if (filter?.actorId) {
      events = events.filter((e) => e.actor_id === filter.actorId);
    }
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;
    return {
      total: events.length,
      events: events.slice(offset, offset + limit),
    };
  }
}
