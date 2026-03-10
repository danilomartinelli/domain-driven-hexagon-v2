import { Test } from "@nestjs/testing";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { EventBusModule } from "../event-bus.module";
import { EventBusPort } from "../event-bus.port";
import { EVENT_BUS_PORT } from "../event-bus.types";
import { InMemoryEventBusAdapter } from "../in-memory.adapter";

describe("EventBusModule (in-memory)", () => {
  it("should create the module with in-memory adapter by default", async () => {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), EventBusModule.forRoot()],
    }).compile();

    const eventBus = module.get<EventBusPort>(EVENT_BUS_PORT);
    expect(eventBus).toBeDefined();
    expect(eventBus).toBeInstanceOf(InMemoryEventBusAdapter);

    await module.close();
  });

  it("should create the module with explicit in-memory adapter", async () => {
    const module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        EventBusModule.forRoot({ adapter: "in-memory" }),
      ],
    }).compile();

    const eventBus = module.get<EventBusPort>(EVENT_BUS_PORT);
    expect(eventBus).toBeInstanceOf(InMemoryEventBusAdapter);

    await module.close();
  });
});

describe("InMemoryEventBusAdapter", () => {
  let eventBus: InMemoryEventBusAdapter;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    eventBus = new InMemoryEventBusAdapter(eventEmitter);
  });

  it("should publish an event via EventEmitter2", async () => {
    const spy = jest.fn();
    eventEmitter.on("test-event", spy);

    await eventBus.publish("test-event", { data: "hello" });

    expect(spy).toHaveBeenCalledWith({ data: "hello" });
  });

  it("should subscribe to events and invoke handler", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventBus.subscribe("my-event", handler);

    eventEmitter.emit("my-event", { key: "value" });

    expect(handler).toHaveBeenCalledWith({ key: "value" });
  });

  it("should handle multiple subscribers to the same event", async () => {
    const handler1 = jest.fn().mockResolvedValue(undefined);
    const handler2 = jest.fn().mockResolvedValue(undefined);

    eventBus.subscribe("shared-event", handler1);
    eventBus.subscribe("shared-event", handler2);

    eventEmitter.emit("shared-event", { msg: "test" });

    expect(handler1).toHaveBeenCalledWith({ msg: "test" });
    expect(handler2).toHaveBeenCalledWith({ msg: "test" });
  });

  it("should not invoke handler for unrelated events", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventBus.subscribe("target-event", handler);

    eventEmitter.emit("other-event", { msg: "ignored" });

    expect(handler).not.toHaveBeenCalled();
  });
});
