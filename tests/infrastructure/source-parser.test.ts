import { describe, expect, it } from "vitest";
import { ClrhomeTableParser } from "../../src/infrastructure/source-parser.js";

describe("ClrhomeTableParser", () => {
  it("parses td cells into instruction records", () => {
    const html = `
      <table>
        <tr>
          <td>
            <code>ld a,<var>n</var></code>
            <dl>
              <dt>Opcode</dt><dd>3E <var>n</var></dd>
              <dt>Bytes</dt><dd>2</dd>
              <dt>Cycles</dt><dd>7</dd>
              <dt>C</dt><dd>unaffected</dd>
              <dt>N</dt><dd>unaffected</dd>
              <dt>P/V</dt><dd>unaffected</dd>
              <dt>H</dt><dd>unaffected</dd>
              <dt>Z</dt><dd>unaffected</dd>
              <dt>S</dt><dd>unaffected</dd>
              <dd>Loads immediate value into A.</dd>
            </dl>
          </td>
          <td class="undocumented">
            <code>set 4,(iy+<var>d</var>),a</code>
            <dl>
              <dt>Opcode</dt><dd>FD CB <var>d</var> E7</dd>
              <dt>Bytes</dt><dd>4</dd>
              <dt>Cycles</dt><dd>23</dd>
              <dt>C</dt><dd>unaffected</dd>
              <dt>N</dt><dd>unaffected</dd>
              <dt>P/V</dt><dd>unaffected</dd>
              <dt>H</dt><dd>unaffected</dd>
              <dt>Z</dt><dd>unaffected</dd>
              <dt>S</dt><dd>unaffected</dd>
              <dd>Sets bit 4.</dd>
            </dl>
          </td>
        </tr>
      </table>
    `;

    const parser = new ClrhomeTableParser();
    const records = parser.parseFromClrhomeTable(html);

    expect(records).toHaveLength(2);
    expect(records[0]?.syntax).toBe("LD A,N");
    expect(records[0]?.opcode.full).toBe("3E N");
    expect(records[0]?.registers).toContain("A");
    expect(records[0]?.documentationStatus).toBe("documented");
    expect(records[0]?.cycles.tStates).toEqual([7]);

    expect(records[1]?.syntax).toBe("SET 4,(IY+D),A");
    expect(records[1]?.opcode.prefix).toBe("FD CB");
    expect(records[1]?.documentationStatus).toBe("undocumented");
    expect(records[1]?.opcode.bytes).toBe(4);
  });
});
