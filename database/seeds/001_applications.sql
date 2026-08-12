INSERT INTO applications (
  company, position, job_url, status, applied_at, notes, next_action, follow_up_at
)
VALUES
  ('VNG Corporation', 'Backend Intern', 'https://career.vng.com.vn', 'applied', '2026-08-01', 'Review Node.js fundamentals before the technical interview.', 'Email the recruiter with an updated portfolio link.', '2026-08-14'),
  ('MoMo', 'Frontend Engineering Intern', 'https://momo.careers', 'interview', '2026-07-27', 'Prepare a walkthrough of the React dashboard project.', 'Practice the dashboard architecture walkthrough.', '2026-08-13'),
  ('Grab Vietnam', 'Software Engineer Intern', 'https://www.grab.careers', 'wishlist', NULL, 'Tailor the resume toward API and database experience.', 'Tailor the resume to the role.', '2026-08-18'),
  ('NashTech', 'Full-stack Intern', 'https://careers.nashtechglobal.com', 'offer', '2026-07-15', 'Compare mentorship, project scope, and start date.', 'Ask about the proposed start date.', '2026-08-15'),
  ('KMS Technology', 'Node.js Intern', 'https://careers.kms-technology.com', 'rejected', '2026-06-20', 'Ask for feedback and record the topics to revisit.', NULL, NULL);

INSERT INTO application_status_history (application_id, from_status, to_status, changed_at)
SELECT id, NULL, status, created_at
FROM applications;
