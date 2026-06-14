
DROP POLICY IF EXISTS "Quizzes insertable" ON public.quizzes;
REVOKE INSERT ON public.quizzes FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
