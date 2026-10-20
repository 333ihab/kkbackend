process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWaitlistService } = require("../src/services/waitlist.service");

const entry = { id: "entry-1", name: "Test Person", email: "test@example.com", size: "M" };

const fakeClient = (responses) => {
  const calls = [];
  return {
    calls,
    from() {
      const builder = {
        operation: "select",
        insert() { this.operation = "insert"; return this; },
        select() { return this; },
        single() { return this; },
        maybeSingle() { return this; },
        eq() { return this; },
        limit() { return this; },
        retry() { return this; },
        abortSignal() { return this; },
        then(resolve, reject) {
          calls.push(this.operation);
          return Promise.resolve(responses.shift()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
};

const noWait = { sleep: async () => {}, random: () => 0 };

test("temporary outage recovers on a later bounded attempt", async () => {
  const client = fakeClient([
    { error: { message: "fetch failed", details: "Caused by: Error: DNS (EAI_AGAIN)", status: 0 } },
    { error: { message: "temporary", status: 503 } },
    { data: entry, error: null, status: 201 },
  ]);
  const service = createWaitlistService(client, noWait);

  assert.deepEqual(await service.createWaitlistEntry({ fullName: entry.name, email: entry.email, size: entry.size }), entry);
  assert.equal(client.calls.length, 3);
});

test("temporary failure stops after three total attempts", async () => {
  const client = fakeClient(Array.from({ length: 3 }, () => ({ error: { message: "fetch failed", status: 0 } })));
  const service = createWaitlistService(client, noWait);

  await assert.rejects(service.createWaitlistEntry({ fullName: entry.name, email: entry.email, size: entry.size }), { name: "SupabaseUnavailableError", status: 503 });
  assert.equal(client.calls.length, 3);
});

test("permanent authorization errors are not retried", async () => {
  const client = fakeClient([{ error: { message: "permission denied", code: "42501", status: 403 } }]);
  const service = createWaitlistService(client, noWait);

  await assert.rejects(service.createWaitlistEntry({ fullName: entry.name, email: entry.email, size: entry.size }), { code: "42501" });
  assert.equal(client.calls.length, 1);
});

test("duplicate email after uncertain outcome returns existing registration", async () => {
  const client = fakeClient([
    { error: { message: "duplicate key", code: "23505", status: 409 } },
    { data: entry, error: null, status: 200 },
  ]);
  const service = createWaitlistService(client, noWait);

  assert.deepEqual(await service.createWaitlistEntry({ fullName: entry.name, email: entry.email, size: entry.size }), { ...entry, wasExisting: true });
  assert.deepEqual(client.calls, ["insert", "select"]);
});
