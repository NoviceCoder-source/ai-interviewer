// Resume uploads (BUG-003: text-less scanned PDFs were accepted).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanResumeText, isReadableResume } from '../app/lib/resumeText';

test('pdf2json page-break markers alone are not readable text', () => {
  assert.equal(cleanResumeText('----------------Page (0) Break----------------'), '');
  assert.equal(isReadableResume(cleanResumeText('----------------Page (0) Break----------------\r\n----------------Page (1) Break----------------')), false);
});

test('a stray page number is not a resume', () => {
  assert.equal(isReadableResume(cleanResumeText('1\r\n----------------Page (0) Break----------------')), false);
});

test('a real resume is accepted', () => {
  const text = 'Ankit Yadav\nData Analyst with experience in Python, SQL and Power BI dashboards for retail sales.\n----------------Page (0) Break----------------';
  assert.equal(isReadableResume(cleanResumeText(text)), true);
  assert.doesNotMatch(cleanResumeText(text), /Page \(0\) Break/);
});
