/**
 * **EXPERIMENTAL** actors model implementation.
 */
import {scheduler} from "./scheduler";

export const enum MessageFlags {
  Trace = 1,
}

export const enum ActorFlags {
  // Actor is registered in the scheduler actor task queue.
  Active          = 1,
  IncomingMessage = 1 << 1,
}

export type ActorMessageHandler<S> = (message: Message<any>, state: S) => S;

export class MessageDescriptor<P> {
  _flags: number;
  _markFlags: number;
  readonly id: number | string;

  constructor(id: number | string) {
    this._flags = 0;
    this.id = id;
  }

  enableTracing(): MessageDescriptor<P> {
    this._markFlags |= MessageFlags.Trace;
    return this;
  }

  create(payload: P): Message<P> {
    return new Message<P>(this, payload, this._markFlags);
  }
}

export class Message<P> {
  _flags: number;
  readonly descriptor: MessageDescriptor<P>;
  readonly payload: P;

  constructor(descriptor: MessageDescriptor<P>, payload: P, flags: number) {
    this._flags = flags;
    this.descriptor = descriptor;
    this.payload = payload;
  }
}

export class ActorDescriptor<S> {
  _flags: number;
  _handleMessage: ActorMessageHandler<S>;

  constructor(handleMessage: ActorMessageHandler<S>) {
    this._flags = 0;
    this._handleMessage = handleMessage;
  }
}

export class Actor<S> {
  _flags: number;
  readonly descriptor: ActorDescriptor<S>;
  state: S;
  _inbox: Message<any>[] | null;

  constructor(descriptor: ActorDescriptor<S>, state: S) {
    this._flags = 0;
    this.descriptor = descriptor;
    this.state = state;
    this._inbox = null;
  }

  send(message: Message<any>): void {
    scheduler.sendMessage(this, message);
  }
}

export function actorAddMessage(actor: Actor<any>, message: Message<any>): void {
  if ((actor._flags & ActorFlags.IncomingMessage) === 0) {
    actor._inbox = [];
    actor._flags |= ActorFlags.IncomingMessage;
  }
  actor._inbox!.push(message);
}

export function actorRun(actor: Actor<any>) {
  const handleMessage = actor.descriptor._handleMessage;
  while ((actor._flags & ActorFlags.IncomingMessage) !== 0) {
    const inbox = actor._inbox!;
    actor._inbox = null;
    actor._flags &= ~ActorFlags.IncomingMessage;
    for (let i = 0; i < inbox.length; i++) {
      actor.state = handleMessage(inbox[i], actor.state);
    }
  }
  actor._flags &= ~ActorFlags.Active;
}
