/**
 * **EXPERIMENTAL** actors model implementation.
 */
import {scheduler} from "./scheduler";

/**
 * This function doesn't do anything, it just returns the same `groupName` value.
 *
 * It is used so that when building application in production mode, we can replace all occurences of
 * `getMessageGroupName` function and minify all group names.
 */
export function getMessageGroupName(groupName: string): string {
  return groupName;
}

/**
 * This function doesn't do anything, it just returns the same `messageName` value.
 *
 * It is used so that when building application in production mode, we can replace all occurences of
 * `getMessageName` function and minify all message names.
 */
export function getMessageName(messageName: string): string {
  return messageName;
}

/**
 * Message flags.
 */
export const enum MessageFlags {
  // Enable message tracing.
  Trace         = 1,
  // Message were created from an action initiated by user.
  UserInitiated = 1 << 1,
  // Message were consumed by an actor.
  Consumed      = 1 << 2,
}

/**
 * Global counter that generates unique ids for actors.
 */
let _nextActorId = 0;

/**
 * Highest bit used for a message flag.
 */
let _nextMessageFlag = 1 << 2;

/**
 * Message group registry that is used in DEBUG mode to check that all message names are unique.
 */
export const MessageGroupRegistry = ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") ?
  new Map<string, Set<string>>() :
  undefined;

/**
 * Actor registry that is used in DEBUG mode.
 */
export const ActorRegistry = ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") ?
  new Map<number, Actor<any, any>>() :
  undefined;

/**
 * Acquire a new message flag at runtime.
 */
export function acquireMessageFlag(): number {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (_nextMessageFlag === 1 << 31) {
      throw Error("Failed to acquire new message flag: no free message flags left.");
    }
  }
  _nextMessageFlag <<= 1;
  return _nextMessageFlag;
}

/**
 * Actor flags.
 */
export const enum ActorFlags {
  // Actor is registered in the scheduler actor task queue.
  Active          = 1,
  // Inbox has an incoming message.
  IncomingMessage = 1 << 1,
  // Actor is disposed.
  Disposed        = 1 << 2,
}

/**
 * Message handler function.
 */
export type ActorMessageHandler<P, S> = (actor: Actor<P, S>, message: Message<any>, props: P, state: S) => S;

/**
 * Middleware handler.
 */
export type ActorMiddleware<P, S> =
  (actor: Actor<P, S>, message: Message<any>, next: ActorNextMiddleware<P, S>) => void;
export type ActorNextMiddleware<P, S> = (message: Message<any>) => void;

/**
 * Message group.
 *
 * Example:
 *
 *     const RouterMessages = new MessageGroup("app.router");
 *     const ChangeRoute = RouterMessages.create<string>("changeRoute");
 *     const msg = ChangeRoute.create("/home");
 *
 *     actor.send(msg);
 */
export class MessageGroup {
  /**
   * Metadata.
   */
  _meta: Map<Symbol, any>;
  /**
   * Flags that will be marked on message descriptor instances. See `MessageDescriptorFlags` for details.
   */
  _markDescriptorFlags: number;
  /**
   * Flags that will be marked on message instances. See `MessageFlags` for details.
   */
  _markMessageFlags: number;
  /**
   * Id counter that is used to generate unique ids for message descriptors.
   */
  _nextId: number;
  /**
   * Group name.
   */
  readonly name: string;

  constructor(name: string) {
    this._meta = new Map<Symbol, any>();
    this._markDescriptorFlags = 0;
    this._markMessageFlags = 0;
    this._nextId = 0;
    this.name = name;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (MessageGroupRegistry!.has(name)) {
        throw Error(`Failed to create a new message group: group with name "${name}" already exist.`);
      } else {
        MessageGroupRegistry!.set(name, new Set<string>());
      }
    }
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
   * Set metadata.
   */
  setMeta<M>(key: Symbol, value: M): MessageGroup {
    this._meta.set(key, value);
    return this;
  }

  /**
   * Create a new message descriptor.
   */
  create<P>(name: string): MessageDescriptor<P> {
    return new MessageDescriptor<P>(this, this.acquireId(), name, this._markDescriptorFlags, this._markMessageFlags);
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
   * Unique id among message in the same group.
   */
  readonly id: number;
  /**
   * Message group.
   */
  readonly group: MessageGroup;
  /**
   * Message name.
   */
  readonly name: string;
  /**
   * Metadata.
   */
  _meta: Map<Symbol, any>;

  constructor(group: MessageGroup, id: number, name: string, flags: number, messageFlags: number) {
    this._flags = flags;
    this._markFlags = messageFlags;
    this.id = id;
    this.group = group;
    this.name = name;
    this._meta = new Map<Symbol, any>();

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      const messageNames = MessageGroupRegistry!.get(group.name);
      if (messageNames!.has(name)) {
        throw Error(`Failed to create a new message descriptor: descriptor with name "${name}" in message group ` +
                    `"${group.name}" already exist.`);
      } else {
        messageNames!.add(name);
      }
    }
  }

  /**
   * Enable tracing.
   */
  enableTracing(): MessageDescriptor<P> {
    this._markFlags |= MessageFlags.Trace;
    return this;
  }

  /**
   * Add metadata.
   */
  setMeta<M>(key: Symbol, value: M): MessageDescriptor<P> {
    this._meta.set(key, value);
    return this;
  }

  /**
   * Create a new message.
   */
  create(payload?: P): Message<P> {
    return new Message<P>(this, payload === undefined ? null : payload, this._markFlags);
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
  readonly payload: P | null;
  /**
   * Metadata.
   */
  _meta: Map<Symbol, any> | null;

  constructor(descriptor: MessageDescriptor<P>, payload: P | null, flags: number) {
    this._flags = flags;
    this.descriptor = descriptor;
    this.payload = payload;
    this._meta = null;
  }

  /**
   * Add metadata.
   */
  setMeta<M>(key: Symbol, value: M): Message<P> {
    if (this._meta === null) {
      this._meta = new Map<Symbol, any>();
    }
    this._meta.set(key, value);
    return this;
  }

  /**
   * Get metadata.
   */
  getMeta<M>(key: Symbol): M | undefined {
    let value = this.descriptor.group._meta.get(key);
    if (value === undefined) {
      value = this.descriptor._meta.get(key);
    }
    if (value === undefined && this._meta !== null) {
      value = this._meta.get(key);
    }
    return value;
  }
}

/**
 * System messages group.
 */
export const SystemMessageGroup = new MessageGroup(getMessageGroupName("system"));

/**
 * System message: actor disposed.
 */
export const ActorDisposedMessage = SystemMessageGroup.create<Actor<any, any>>(getMessageName("actorDisposed"));

/**
 * Link actor `a` to another actor `b`.
 */
export class ActorLink {
  readonly a: Actor<any, any>;
  readonly b: Actor<any, any>;
  _prev: ActorLink | null;
  _next: ActorLink | null;

  private _isCanceled: boolean;

  constructor(a: Actor<any, any>, b: Actor<any, any>) {
    this.a = a;
    this.b = b;

    const firstALink = a._links;

    if (firstALink !== null) {
      firstALink._prev = this;
      this._next = firstALink;
    }

    a._links = this;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._isCanceled = false;
    }
  }

  /**
   * Cancel link.
   */
  cancel(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this._isCanceled) {
        throw new Error("Failed to cancel actor link: actor link is already canceled.");
      }
      this._isCanceled = true;
    }

    if (this._prev === null) {
      this.a._links = this._next;
    } else {
      this._prev._next = this._next;
    }
    if (this._next !== null) {
      this._next._prev = this._prev;
    }
  }
}

/**
 * Actor descriptor.
 *
 *     const StoreActor = new ActorDescriptor<Props, State>()
 *       .handleMessage((message, state) => {
 *         if (message.descriptor === DeleteItemMessage) {
 *           state.removeItem(message.payload as number);
 *         }
 *         return state;
 *       });
 */
export class ActorDescriptor<P, S> {
  /**
   * Flags, see `ActorDescriptorFlags` for details.
   */
  _flags: number;
  /**
   * Flags that will be marked on actor instances, see `ActorFlags` for details.
   */
  _markFlags: number;
  /**
   * Create state handler.
   */
  _createState: ((actor: Actor<P, S>, props: P | null) => S) | null;
  /**
   * Init handler.
   */
  _init: ((actor: Actor<P, S>, props: P | null, state: S | null) => void) | null;
  /**
   * Message handler.
   */
  _handleMessage: ActorMessageHandler<P, S> | null;
  /**
   * Middleware handlers.
   */
  _middleware: ActorMiddleware<P, S>[] | null;
  /**
   * Disposed handler.
   */
  _disposed: ((actor: Actor<P, S>, props: P | null, state: S | null) => void) | null;

  constructor() {
    this._flags = 0;
    this._markFlags = 0;
    this._createState = null;
    this._init = null;
    this._handleMessage = null;
    this._middleware = null;
  }

  /**
   * Create a new actor.
   */
  create(props?: P): Actor<P, S> {
    const actor = new Actor<P, S>(this, props, this._markFlags);
    if (this._createState !== null) {
      actor.state = this._createState(actor, actor.props);
    }
    if (this._init !== null) {
      this._init(actor, actor.props, actor.state);
    }
    return actor;
  }

  /**
   * Add middleware.
   */
  addMiddleware(middleware: ActorMiddleware<any, any>): ActorDescriptor<P, S> {
    if (this._middleware === null) {
      this._middleware = [];
    }
    this._middleware.push(middleware);
    return this;
  }

  /**
   * Create state handler.
   */
  createState(handler: (actor: Actor<P, S>, props: P | null) => S): ActorDescriptor<P, S> {
    this._createState = handler;
    return this;
  }

  /**
   * Init handler.
   */
  init(handler: (actor: Actor<P, S>, props: P | null, state: S | null) => S): ActorDescriptor<P, S> {
    this._init = handler;
    return this;
  }

  /**
   * Handle message handler.
   */
  handleMessage(handler: ActorMessageHandler<P, S>): ActorDescriptor<P, S> {
    this._handleMessage = handler;
    return this;
  }

  /**
   * Disposed handler.
   */
  disposed(handler: (actor: Actor<P, S>, props: P | null, state: S | null) => S): ActorDescriptor<P, S> {
    this._disposed = handler;
    return this;
  }
}

/**
 * Actor.
 */
export class Actor<P, S> {
  /**
   * Unique Id.
   */
  readonly id: number;
  /**
   * Flags, see `ActorFlags` for details.
   */
  _flags: number;
  /**
   * Actor descriptor.
   */
  readonly descriptor: ActorDescriptor<P, S>;
  /**
   * Props.
   */
  props: P | null;
  /**
   * State.
   */
  state: S | null;
  /**
   * Message inbox.
   */
  _inbox: Message<any>[];
  /**
   * Middleware handlers.
   */
  _middleware: ActorMiddleware<P, S>[] | null;
  /**
   * Links.
   */
  _links: ActorLink | null;

  constructor(descriptor: ActorDescriptor<P, S>, props: P | undefined, flags: number) {
    this.id = _nextActorId++;
    this._flags = flags;
    this.descriptor = descriptor;
    this.props = props === undefined ? null : props;
    this.state = null;
    this._inbox = [];
    this._middleware = null;
    this._links = null;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      ActorRegistry!.set(this.id, this);
    }
  }

  /**
   * Send a message to an actor.
   */
  send(message: Message<any>): void {
    scheduler.sendMessage(this, message);
  }

  /**
   * Link with another actor.
   */
  link(actor: Actor<any, any>): ActorLink {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      let link = this._links;
      while (link !== null) {
        if (link.b === actor) {
          throw new Error("Failed to link an actor: actor is already linked to this actor.");
        }
        link = link._next;
      }
    }

    return new ActorLink(this, actor);
  }

  /**
   * Dispose.
   */
  dispose(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      ActorRegistry!.delete(this.id);

      if ((this._flags & ActorFlags.Disposed) !== 0) {
        throw new Error("Failed to dispose an actor: actor is already disposed.");
      }
    }

    this._flags |= ActorFlags.Disposed;
    let link = this._links;
    if (link !== null) {
      const msg = ActorDisposedMessage.create(this);
      do {
        link.b.send(msg);
        link = link._next;
      } while (link !== null);
    }
    if (this.descriptor._disposed !== null) {
      this.descriptor._disposed(this, this.props, this.state);
    }
  }

  /**
   * Add middleware.
   */
  addMiddleware(middleware: ActorMiddleware<any, any>): Actor<P, S> {
    if (this._middleware === null) {
      this._middleware = [];
    }
    this._middleware.push(middleware);
    return this;
  }
}

/**
 * Helper function for TypeScript developers to extract payload from messages.
 */
export function getMessagePayload<P>(descriptor: MessageDescriptor<P>, message: Message<P>): P {
  return message.payload!;
}
