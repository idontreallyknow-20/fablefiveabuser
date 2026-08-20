-- Team RPCs are for signed-in users only; is_team_member is internal to
-- policies. (profile_count stays anon-callable by design: the login page
-- uses it to decide whether to offer the bootstrap signup.)

revoke execute on function public.create_team(text, text) from anon;
revoke execute on function public.join_team(text, text) from anon;
revoke execute on function public.claim_team_day(uuid, date) from anon;
revoke execute on function public.team_today(uuid, date) from anon;
revoke execute on function public.team_streak(uuid) from anon;
revoke execute on function public.is_team_member(uuid) from anon;
