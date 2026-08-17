import { useEffect, useState } from "react";
import { AtelierButton } from "../../design-system";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import { PERFORMANCE_STATUS } from "../../config/performanceConfig";
import {
  addEmployeeComments,
  finalizeReview,
  submitReview,
} from "../../services/workforce/performanceService";
import { formatPercent } from "./format";

export function FeedbackReadout({ review }) {
  if (!review) return null;
  const rows = [
    ["Strengths", review.strengths],
    ["Areas for improvement", review.improvements],
    ["Manager feedback", review.managerFeedback],
    ["Employee comments", review.employeeComments],
  ].filter(([, value]) => value);
  if (!rows.length) {
    return <p className="font-ui text-sm text-taupe">No written review yet.</p>;
  }
  return (
    <dl className="space-y-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
          <dd className="mt-1 font-ui text-sm leading-relaxed text-ink">{value}</dd>
        </div>
      ))}
      {review.reviewerName ? (
        <p className="font-ui text-[11px] text-taupe">
          {review.reviewerName}
          {review.reviewedAt ? ` · ${new Date(review.reviewedAt).toLocaleDateString("en-IN")}` : ""}
        </p>
      ) : null}
    </dl>
  );
}

export function EmployeeCommentForm({ record, actor }) {
  const [comments, setComments] = useState(record?.review?.employeeComments || "");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setComments(record?.review?.employeeComments || "");
  }, [record?.performanceId, record?.updatedAt]);

  if (!record || record.status === PERFORMANCE_STATUS.FINALIZED) return null;

  const save = (event) => {
    event.preventDefault();
    const result = addEmployeeComments({
      employeeId: record.employeeId,
      periodKey: record.period,
      comments,
      actor,
    });
    setMessage(result.message);
  };

  return (
    <form onSubmit={save} className="mt-6">
      <EmployeeField label="Your comments" id="perf-emp-comments" optional>
        <textarea id="perf-emp-comments" value={comments} onChange={(event) => setComments(event.target.value)} rows={3} className={employeeInputClass()} />
      </EmployeeField>
      {message ? (
        <p className="mt-2 font-ui text-xs text-cocoa" role="status">
          {message}
        </p>
      ) : null}
      <div className="mt-4">
        <AtelierButton type="submit" size="chip" variant="outline">
          Save comments
        </AtelierButton>
      </div>
    </form>
  );
}

export default function ReviewForm({ record, actor, canFinalize = false }) {
  const [strengths, setStrengths] = useState(record?.review?.strengths || "");
  const [improvements, setImprovements] = useState(record?.review?.improvements || "");
  const [managerFeedback, setManagerFeedback] = useState(record?.review?.managerFeedback || "");
  const [scoreOverride, setScoreOverride] = useState(record?.review?.scoreOverride ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setStrengths(record?.review?.strengths || "");
    setImprovements(record?.review?.improvements || "");
    setManagerFeedback(record?.review?.managerFeedback || "");
    setScoreOverride(record?.review?.scoreOverride ?? "");
    setMessage("");
    setError("");
  }, [record?.performanceId, record?.updatedAt]);

  if (!record) return null;
  const locked = record.status === PERFORMANCE_STATUS.FINALIZED;

  const save = (finalize) => {
    const action = finalize ? finalizeReview : submitReview;
    const result = action({
      employeeId: record.employeeId,
      periodKey: record.period,
      strengths,
      improvements,
      managerFeedback,
      scoreOverride,
      actor,
    });
    if (!result.ok) {
      setError(result.message);
      setMessage("");
      return;
    }
    setError("");
    setMessage(result.message);
  };

  return (
    <div className="space-y-4">
      <p className="font-ui text-[11px] text-taupe">
        Calculated score {formatPercent(record.score)}. Weighting: 50% target · 25% attendance · 25% operational quality.
      </p>
      <EmployeeField label="Strengths" id="rev-strengths">
        <textarea id="rev-strengths" value={strengths} onChange={(event) => setStrengths(event.target.value)} rows={3} disabled={locked} className={employeeInputClass()} />
      </EmployeeField>
      <EmployeeField label="Areas for improvement" id="rev-improve">
        <textarea id="rev-improve" value={improvements} onChange={(event) => setImprovements(event.target.value)} rows={3} disabled={locked} className={employeeInputClass()} />
      </EmployeeField>
      <EmployeeField label="Manager feedback" id="rev-feedback">
        <textarea id="rev-feedback" value={managerFeedback} onChange={(event) => setManagerFeedback(event.target.value)} rows={3} disabled={locked} className={employeeInputClass()} />
      </EmployeeField>
      <EmployeeField label="Score override" id="rev-score" hint="Leave blank to keep the calculated score." optional>
        <input
          id="rev-score"
          type="number"
          min="0"
          max="150"
          step="0.1"
          value={scoreOverride}
          onChange={(event) => setScoreOverride(event.target.value)}
          disabled={locked}
          className={employeeInputClass()}
        />
      </EmployeeField>
      {error ? <p className="font-ui text-xs text-accent" role="alert">{error}</p> : null}
      {message ? <p className="font-ui text-xs text-cocoa" role="status">{message}</p> : null}
      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <AtelierButton type="button" size="chip" onClick={() => save(false)}>
            Save review
          </AtelierButton>
          {canFinalize ? (
            <AtelierButton type="button" size="chip" variant="outline" onClick={() => save(true)}>
              Finalize
            </AtelierButton>
          ) : null}
        </div>
      ) : (
        <p className="font-ui text-xs text-taupe">This review is finalized.</p>
      )}
    </div>
  );
}
