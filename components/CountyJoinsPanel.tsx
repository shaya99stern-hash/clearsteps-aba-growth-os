"use client";

import type { ScoutDataJoins } from "@/lib/intelligence/joins/scout";

function badge(percentile: number | null, agreement: number | null) {
  const value = percentile ?? agreement;
  if (value === null) return { className: "INFO", label: "n/a" };
  return { className: value >= 70 ? "PASS" : value >= 30 ? "REVIEW" : "INFO", label: String(value) };
}

function formatValue(value: number | null) {
  if (value === null) return "—";
  const abs = Math.abs(value);
  return abs < 1 ? value.toFixed(2) : abs < 100 ? value.toFixed(1) : Math.round(value).toLocaleString("en-US");
}

/** Scout result section for the county data joins. Area-level statistics only. */
export function CountyJoinsPanel({ dataJoins, onUseCounty }: { dataJoins: ScoutDataJoins; onUseCounty: (county: string) => void }) {
  const county = dataJoins.county;
  const summary = county
    ? `${county.name.split(",")[0]} · ${county.score ?? "—"}/100 · rank ${county.rank ?? "—"} of ${county.rankedOf}`
    : dataJoins.status === "county_required" ? "Enter a county to score" : "Unavailable";

  return (
    <details className="sourceDisclosure" open={dataJoins.status === "county_matched"}>
      <summary>
        <span>{dataJoins.totalJoins} county data joins</span>
        <span>{summary}</span>
      </summary>
      <div className="sourceRail">
        <p>{dataJoins.note}</p>
        {county && (
          <>
            <div className="sourceItem">
              <i className="sourceDot complete" />
              <div>
                <b>Confidence {county.confidence}% · {county.computedJoins}/{dataJoins.totalJoins} joins computed · source agreement {county.agreement ?? "—"}/100</b>
                <span>{county.familyScores.map((family) => `${family.title} ${family.score ?? "—"}`).join(" · ")}</span>
              </div>
            </div>
            {county.drivers.map((text) => (
              <div className="sourceItem" key={text}><i className="sourceDot complete" /><div><b>Opportunity</b><span>{text}</span></div></div>
            ))}
            {county.cautions.map((text) => (
              <div className="sourceItem" key={text}><i className="sourceDot unavailable" /><div><b>Watch</b><span>{text}</span></div></div>
            ))}
            <details className="ruleDisclosure">
              <summary>All {dataJoins.totalJoins} joins (percentile within the state; validation joins show agreement)</summary>
              <div className="ruleList">
                {county.joins.map((join) => {
                  const mark = badge(join.percentile, join.agreement);
                  return (
                    <div className="ruleRow" key={join.id}>
                      <span className={`ruleBadge ${mark.className}`}>{mark.label}</span>
                      <div className="ruleCopy">
                        <b>{join.id} · {join.title}</b>
                        <p>{join.status === "computed" ? `${formatValue(join.raw)} ${join.unit}` : "Not enough data from the required sources"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        )}
        {!county && dataJoins.suggestions.length > 0 && (
          <div className="sourceItem">
            <i className="sourceDot working" />
            <div>
              <b>Did you mean</b>
              <span>
                {dataJoins.suggestions.map((name) => (
                  <button key={name} type="button" className="underline underline-offset-2 mr-3" onClick={() => onUseCounty(name)}>{name}</button>
                ))}
              </span>
            </div>
          </div>
        )}
        {!county && dataJoins.topCounties.length > 0 && (
          <div className="sourceItem">
            <i className="sourceDot complete" />
            <div>
              <b>Highest-ranked counties in this state</b>
              <span>
                {dataJoins.topCounties.map((item) => (
                  <button key={item.name} type="button" className="underline underline-offset-2 mr-3" onClick={() => onUseCounty(item.name.split(",")[0])}>
                    #{item.rank} {item.name.split(",")[0]} ({item.score})
                  </button>
                ))}
              </span>
            </div>
          </div>
        )}
        <details className="ruleDisclosure">
          <summary>Statistical programs</summary>
          <div className="ruleList">
            {dataJoins.programs.map((program) => (
              <div className="ruleRow" key={program.label}>
                <span className={`ruleBadge ${program.status === "complete" ? "PASS" : program.status === "not_applicable" ? "INFO" : "REVIEW"}`}>{program.status === "not_applicable" ? "n/a" : program.status}</span>
                <div className="ruleCopy"><b>{program.label}</b><p>{program.detail}</p></div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </details>
  );
}
