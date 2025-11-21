create policy "Enable update for users based on user_id" on "public"."users" as PERMISSIVE for
UPDATE to authenticated using (
    (
        select
            auth.uid ()
    ) = id
);