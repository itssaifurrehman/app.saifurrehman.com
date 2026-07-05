// devtools/tests/text-tools.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { words, CONVERTERS } from "../tools/case-converter/lib.js";
import { parseQuery, entriesToJson } from "../tools/query-string/lib.js";

test("words splits camel, snake, kebab and spaces", () => {
  assert.deepEqual(words("getUserByID"), ["get", "User", "By", "ID"]);
  assert.deepEqual(words("some_snake-and space"), ["some", "snake", "and", "space"]);
});

test("all converters produce their case", () => {
  const input = "hello world_example";
  assert.equal(CONVERTERS.camelCase(input), "helloWorldExample");
  assert.equal(CONVERTERS.PascalCase(input), "HelloWorldExample");
  assert.equal(CONVERTERS.snake_case(input), "hello_world_example");
  assert.equal(CONVERTERS["kebab-case"](input), "hello-world-example");
  assert.equal(CONVERTERS["Title Case"](input), "Hello World Example");
});

test("parseQuery handles full URLs, fragments and duplicates", () => {
  assert.deepEqual(
    parseQuery("https://x.com/p?a=1&a=2&b=hi%20there#frag"),
    [["a", "1"], ["a", "2"], ["b", "hi there"]]
  );
  assert.deepEqual(parseQuery("?x=1"), [["x", "1"]]);
  assert.deepEqual(parseQuery("x=1&y="), [["x", "1"], ["y", ""]]);
});

test("entriesToJson groups duplicate keys into arrays", () => {
  assert.deepEqual(
    entriesToJson([["a", "1"], ["a", "2"], ["b", "3"]]),
    { a: ["1", "2"], b: "3" }
  );
});
