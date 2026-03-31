/**
 * Output rendering for Claude Code display.
 */

/**
 * Format a job status table.
 */
export function renderJobTable(jobs) {
  if (!jobs.length) return 'No jobs found.';

  const STATUS_ICON = {
    running: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
    pending: '⏳',
  };

  const lines = [
    '| ID | Type | Status | Model | Started |',
    '|----|------|--------|-------|---------|',
  ];

  for (const job of jobs) {
    const icon = STATUS_ICON[job.status] || '?';
    const started = job.startedAt
      ? new Date(job.startedAt).toLocaleTimeString()
      : '-';
    lines.push(
      `| \`${job.id.slice(0, 8)}\` | ${job.type} | ${icon} ${job.status} | ${job.model || 'default'} | ${started} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format a review result for display.
 */
export function renderReviewResult(result) {
  if (!result) return '(no result available)';
  if (typeof result === 'string') return result;

  const lines = [];

  if (result.verdict) {
    const icon = result.verdict === 'approve' ? '✅' : '⚠️';
    lines.push(`## ${icon} Verdict: ${result.verdict}\n`);
  }

  if (result.summary) {
    lines.push(result.summary + '\n');
  }

  if (result.findings?.length) {
    lines.push('## Findings\n');
    for (const f of result.findings) {
      const sev = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[f.severity] || '⚪';
      lines.push(`### ${sev} ${f.title}`);
      if (f.file) lines.push(`**File:** \`${f.file}\`${f.line_start ? `:${f.line_start}` : ''}`);
      lines.push(f.body);
      if (f.recommendation) lines.push(`\n**Recommendation:** ${f.recommendation}`);
      lines.push('');
    }
  }

  if (result.next_steps?.length) {
    lines.push('## Next steps\n');
    for (const step of result.next_steps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a task result for display.
 */
export function renderTaskResult(result) {
  if (!result) return '(no result available)';
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

/**
 * Format setup status.
 */
export function renderSetupStatus(info) {
  const lines = [
    '## Gemini Plugin Status\n',
    `- **Gemini CLI:** ${info.installed ? '✅ installed' : '❌ not found'}`,
  ];

  if (info.installed && info.version) {
    lines.push(`- **Version:** ${info.version}`);
  }

  lines.push(`- **Review gate:** ${info.reviewGate ? '✅ enabled' : '⬚ disabled'}`);

  if (info.activeJobs > 0) {
    lines.push(`- **Active jobs:** ${info.activeJobs}`);
  }

  return lines.join('\n');
}
