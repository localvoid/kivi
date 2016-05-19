/**
 * **EXPERIMENTAL** actors model implementation.
 */
import {scheduler} from "./scheduler";

/**
 * Message flags.
 */
export const enum MessageFlags {
  // Enable message tracing.
  Trace = 1,
}

/**
 * Actor flags.
 */
export const enum ActorFlags {
  // Actor is registered in the scheduler actor task queue.
  Active          = 1,
  // Inbox has an incoming message.
  IncomingMessage = 1 << 1,
}

/**
 * Message handler function.
 */
export type ActorMessageHandler<S> = (state: S, message: Message<any>) => S;

/**
 * Middleware handler.
 */
export type ActorMiddleware<S> =
  (actor: Actor<S>, message: Message<any>, next: ActorMiddleware<S>) => void;


/**
 * Message group.
 *
 * Example:
 *
 *     const RouterMessages = new MessageGroup("app.router");
 *     const ChangeRoute = RouterMessages.create<string>("changeRoute");
 *     const msg = ChangeRoute.create("/home");
 */
export class MessageGroup {
  /**
   * Id counter that is used to generate unique ids for message descriptors.
   */
  _nextId: number;
  /**
   * Flags that will be marked on message descriptor instances. See `MessageDescriptorFlags` for details.
   */
  _markDescriptorFlags: number;
  /**
   * Flags that will be marked on message instances. See `MessageFlags` for details.
   */
  _markMessageFlags: number;
  /**
   * Static identifier.
   */
  readonly id: number | string;

  constructor(id: number | string) {
    this._nextId = 0;
    this._markDescriptorFlags = 0;
    this._markMessageFlags = 0;
    this.id = id;
  }

  /**
   * Maximum id that was used to create message descriptors.
   */
  maxId(): number {
    return this._nextId;
  }

  /**
   * Acquire a new id.
   */
  acquireId(): number {
    return this._nextId++;
  }

  /**
   * Enable tracing for all messages in this group.
   */
  enableTracing(): MessageGroup {
    this._markMessageFlags |= MessageFlags.Trace;
    return this;
  }

  /**
   * Create a new message descriptor.
   */
  create<P>(id: number | string): MessageDescriptor<P> {
    return new MessageDescriptor<P>(this, this.acquireId(), id, this._markDescriptorFlags, this._markMessageFlags);
  }
}

/**
 * Message descriptor.
 */
export class MessageDescriptor<P> {
  /**
   * Flags, see `MessageDescriptorFlags` for details.
   */
  _flags: number;
  /**
   * Flags that will be marked on message instances. See `MessageFlags` for details.
   */
  _markFlags: number;
  /**
   * Unique id.
   */
  readonly uid: number;
  /**
   * Static identifier.
   */
  readonly id: number | string;
  /**
   * Message group.
   */
  readonly group: MessageGroup;

  constructor(group: MessageGroup, uid: number, id: number | string, flags: number, messageFlags: number) {
    this._flags = flags;
    this._markFlags = messageFlags;
    this.uid = uid;
    this.id = id;
    this.group = group;
  }

  /**
   * Enable tracing.
   */
  enableTracing(): MessageDescriptor<P> {
    this._markFlags |= MessageFlags.Trace;
    return this;
  }

  /**
   * Create a new message.
   */
  create(payload: P): Message<P> {
    return new Message<P>(this, payload, this._markFlags);
  }
}

/**
 * Messages are used for communications between actors.
 */
export class Message<P> {
  /**
   * Flags, see `MessageFlags` for details.
   */
  _flags: number;
  /**
   * Message descriptor.
   */
  readonly descriptor: MessageDescriptor<P>;
  /**
   * Message payload.
   */
  readonly payload: P;

  constructor(descriptor: MessageDescriptor<P>, payload: P, flags: number) {
    this._flags = flags;
    this.descriptor = descriptor;
    this.payload = payload;
  }
}

/**
 * Actor descriptor.
 *
 *     const StoreActor = new ActorDescriptor<State>((message, state) => {
 *       if (message.descriptor === DeleteItemMessage) {
 *         state.removeItem(message.payload as number);
 *       }
 *       return state;
 *     });
 */
export class ActorDescriptor<S> {
  /**
   * Flags, see `ActorDescriptorFlags` for details.
   */
  _flags: number;
  /**
   * Flags that will be marked on actor instances, see `ActorFlags` for details.
   */
  _markFlags: number;
  /**
   * Message handler.
   */
  readonly _handleMessage: ActorMessageHandler<S>;
  /**
   * Middleware handlers.
   */
  _middleware: ActorMiddleware<S>[] | null;

  constructor(handleMessage: ActorMessageHandler<S>) {
    this._flags = 0;
    this._markFlags = 0;
    this._handleMessage = handleMessage;
    this._middleware = null;
  }

  /**
   * Create a new actor.
   */
  create(state: S): Actor<S> {
    return new Actor(this, state, this._markFlags);
  }

  addMiddleware(middleware: ActorMiddleware<any>): ActorDescriptor<S> {
    if (this._middleware === null) {
      this._middleware = [];
    }
    this._middleware.push(middleware);
    return this;
  }

}

/**
 * Actor.
 */
export class Actor<S> {
  /**
   * Flags, see `ActorFlags` for details.
   */
  _flags: number;
  /**
   * Actor descriptor.
   */
  readonly descriptor: ActorDescriptor<S>;
  /**
   * State.
   */
  state: S;
  /**
   * Message inbox.
   */
  _inbox: Message<any>[];
  /**
   * Middleware handlers.
   */
  _middleware: ActorMiddleware<S>[] | null;

  constructor(descriptor: ActorDescriptor<S>, state: S, flags: number) {
    this._flags = flags;
    this.descriptor = descriptor;
    this.state = state;
    this._inbox = [];
    this._middleware = null;
  }

  /**
   * Send a message to an actor.
   */
  send(message: Message<any>): void {
    scheduler.sendMessage(this, message);
  }

  addMiddleware(middleware: ActorMiddleware<any>): Actor<S> {
    if (this._middleware === null) {
      this._middleware = [];
    }
    this._middleware.push(middleware);
    return this;
  }
}

export function actorAddMessage(actor: Actor<any>, message: Message<any>): void {
  if ((actor._flags & ActorFlags.IncomingMessage) === 0) {
    actor._flags |= ActorFlags.IncomingMessage;
  }
  actor._inbox.push(message);
}

/**
 * Helper function for TypeScript developers to extract payload from messages.
 */
export function getMessagePayload<P>(descriptor: MessageDescriptor<P>, message: Message<P>): P {
  return message.payload;
}
