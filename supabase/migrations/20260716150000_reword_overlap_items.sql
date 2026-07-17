-- =====================================================
-- MIGRATION: Reword cross-loading / double-barreled conceptual items
-- (audit Part 1 §5.1 and §5.3). Axis assignments and keys unchanged —
-- only wording, so each item measures ONE construct on ONE axis.
--
--  id 10 (C2): drop the "funded by taxing wealth" second barrel.
--  id 20 (C3): protest content overlapped F1's civil-disobedience
--              items; reframed to what the STATE may do (C3's
--              construct) instead of endorsing tactics (F1's).
--  id 24 (C3): "schools and employers" are private actors; axis is
--              state coercion vs civil liberties. Reframed to state
--              power over public gatherings.
--  id 48 (C6): "national borders" wording pulled immigration-policy
--              attitudes (C7) into a moral-concern item; reframed to
--              pure scope-of-moral-concern.
--  id 55 (C7): "free movement benefits everyone" measured migration
--              attitudes (C6/C7 blend); reframed to pooling
--              sovereignty through agreements (C7's construct).
--  id 143 (F2, applied): weak discriminator — trusting respondents
--              also want "independent verification". Sharpened so only
--              skeptics agree.
-- =====================================================

BEGIN;

UPDATE questions SET
  text = 'Guaranteeing every citizen a basic income would create a more just society.',
  educational_content = 'A universal basic income provides a guaranteed income floor for all citizens. Supporters argue it reduces poverty and provides security in a changing economy. Critics view it as an inefficient transfer that discourages work and production. How it would be funded is a separate question - this item asks only about the goal.'
WHERE id = 10;

UPDATE questions SET
  text = 'Governments should not have the power to shut down protests just because they are disruptive.',
  educational_content = 'This question asks about the limits of state power over assembly. Civil liberties advocates view protest rights as a fundamental check on government, even when protests disrupt daily life. Order-focused perspectives argue authorities need discretion to protect the public and keep society functioning.'
WHERE id = 20;

UPDATE questions SET
  text = 'Authorities should be able to ban public gatherings that risk disorder, even before any law has been broken.',
  educational_content = 'Preventive restrictions raise the security-liberty tradeoff in its sharpest form: acting before harm occurs. Security-oriented perspectives argue prevention protects the public; civil libertarians counter that pre-emptive bans punish people for things that have not happened and invite abuse.'
WHERE id = 24;

UPDATE questions SET
  text = 'How much someone''s wellbeing matters shouldn''t depend on where they happen to have been born.',
  educational_content = 'Universalists view birthplace as morally arbitrary - suffering matters equally wherever it occurs. Particularists argue that special obligations to family, community, and nation are natural and necessary, and that concern legitimately diminishes with distance.'
WHERE id = 48;

UPDATE questions SET
  text = 'Countries benefit from joining agreements that let people live and work freely across each other''s borders.',
  educational_content = 'Free-movement agreements (like the EU''s) pool a core element of sovereignty. Integrationists argue such arrangements expand opportunity and bind nations together peacefully. Sovereigntists counter that control over who enters and settles is a defining national power that should not be delegated.'
WHERE id = 55;

UPDATE questions SET
  text = 'When public health officials recommend a new vaccine, I assume politics or money shaped the guidance more than evidence.'
WHERE id = 143;

COMMIT;
