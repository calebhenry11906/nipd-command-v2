# NIPD Command — UX Design Standards

Reference: https://lawsofux.com/

This document guides future design and development of the NIPD Command **public, fictional-data prototype**. Keep consistent navigation and styling across employee, supervisory, captain, and administration views.

## Practical design rules

1. **Jakob's Law (familiarity):** Use familiar enterprise dashboard conventions. Clear sidebar navigation, labeled tabs, predictable forms, and consistent action placement. Do not introduce novel gestures for routine police administrative tasks.
2. **Hick's Law / choice overload:** Show the most relevant actions first. Group modules into familiar categories and use progressive disclosure for uncommon options.
3. **Fitts's Law:** Provide large touch/click targets for mobile officers; leave adequate spacing. Make primary actions easy to reach and avoid tiny icon-only buttons.
4. **Miller's Law / cognitive load / chunking:** Group lengthy forms into sections (personnel, dates, equipment, supporting details). Show a small digestible set of fields per step; don't force users to memorize values across screens.
5. **Law of Proximity / Common Region / Similarity:** Related fields and controls should be grouped with clear labels and uniform visual styles. Status badges should look and behave consistently across modules.
6. **Doherty Threshold:** Provide immediate feedback to clicks, loading/saving indicators, and success/error messages. Where possible, keep routine interactions responsive; don't claim success before data is saved.
7. **Aesthetic-Usability Effect:** Retain a restrained navy/gold visual identity, legible text, meaningful whitespace, and visual hierarchy. Prioritize clarity and contrast over decoration.
8. **Von Restorff Effect:** Reserve conspicuous styling for important exceptions (e.g. staffing shortage, overdue approval). Avoid turning every badge or tile into an alert.
9. **Serial Position Effect:** Put the most frequent and most important actions where users can find them quickly. Prioritize common tasks in navigation and dashboard shortcuts.
10. **Tesler's Law:** Keep complex rules (supervisory chain, vacation eligibility, equipment routing, schedule conflict detection) in the software logic rather than requiring employees to work them out manually.
11. **Peak-End Rule / Zeigarnik Effect:** Provide a clear completion state after submission, and a visible, unambiguous list of pending/incomplete work.
12. **Occam's Razor:** Prefer the simplest usable workflow meeting requirements; do not add screens or settings without a clear user benefit.

## Screen standards

- **Homepage:** Dashboard focuses on actionable information: next shift, outstanding approvals, current requests, urgent exceptions. Avoid decorative or irrelevant metrics.
- **Scheduling:** Clear calendar and list views; distinct statuses; filters for division/shift; conflict details visible before assigning or approving.
- **Leave & Training:** Show requester, dates, staffing implications, approver, and status. Distinguish submitted, first-stage approved, fully approved, and denied.
- **Equipment:** Show assigned inventory and request history; route requests through authorized Sergeant **or** Lieutenant, then final equipment-captain approval, then fulfillment.
- **On-call:** One voluntary slot per date, with conflicts clearly highlighted.
- **Forms:** Clear required labels, format guidance, inline validation, cancel/save options, and explicit confirmation for irreversible actions.
- **Accessibility:** Keyboard navigation, visible focus, descriptive control labels, suitable contrast, no color-only status meaning, responsive layout, accessible table headings, and reduced-motion-friendly interactions.
- **Responsive UI:** Design mobile-first and test narrow/medium/wide screens.
- **Feedback:** Show empty, loading, error, pending, success, and denied states. Protect against repeated submissions.
- **Safety:** On this public GitHub Pages prototype, never display or request actual case data, real personnel records, private departmental information, or credentials. Role selection is demo-only, not authorization.

## Acceptance checklist for every new module

- [ ] Users can locate the primary action without instructions.
- [ ] The layout uses familiar patterns and shared components.
- [ ] Related controls are grouped; primary and destructive actions are distinct.
- [ ] Desktop and mobile layouts are usable, with touch-friendly targets.
- [ ] Keyboard and screen-reader basics are respected.
- [ ] Validation and feedback are clear; save states are accurate.
- [ ] Filters, status labels, and navigation behave consistently.
- [ ] The design avoids unnecessarily complex decisions.
- [ ] No real sensitive data or fake access-control assurances appear in the public prototype.
- [ ] The page is reviewed against the relevant principles at https://lawsofux.com/.

These are design heuristics rather than guarantees. Usability testing with representative users remains necessary.
