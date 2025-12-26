import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

type Events = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// Node.js EventEmitter has a generic interface, but the web version doesn't.
// We cast to a typed version to get autocompletion and type safety.
class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<TEventName extends keyof TEvents>(
    eventName: TEventName,
    ...eventArg: Parameters<TEvents[TEventName]>
  ) {
    this.emitter.emit(eventName as string | symbol, ...eventArg);
  }

  on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    handler: TEvents[TEventName]
  ) {
    this.emitter.on(eventName as string | symbol, handler as any);
  }
  
  off<TEventName extends keyof TEvents>(
    eventName: TEventName,
    handler: TEvents[TEventName]
  ) {
    this.emitter.off(eventName as string | symbol, handler as any);
  }
}

export const errorEmitter = new TypedEventEmitter<Events>();
