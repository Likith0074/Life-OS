-- Function to securely fetch all user data for the public Trainer View
-- SECURITY DEFINER allows it to bypass row level security
CREATE OR REPLACE FUNCTION get_trainer_data(share_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user uuid;
  result json;
BEGIN
  -- 1. Validate the token and find the linked user
  SELECT user_id INTO target_user 
  FROM public.share_links 
  WHERE token = share_token 
    AND revoked = false 
    AND (expires_at > now() OR expires_at IS NULL);
  
  -- If token is invalid or expired, return error
  IF target_user IS NULL THEN 
    RETURN json_build_object('error', 'Invalid or expired token');
  END IF;

  -- 2. Build and return all the unified data for that user
  SELECT json_build_object(
    'body_stats', COALESCE((SELECT json_agg(bs ORDER BY date ASC) FROM public.body_stats bs WHERE bs.user_id = target_user), '[]'::json),
    'training_logs', COALESCE((SELECT json_agg(tl ORDER BY date DESC) FROM public.training_logs tl WHERE tl.user_id = target_user), '[]'::json),
    'daily_logs', COALESCE((SELECT json_agg(dl ORDER BY date DESC) FROM public.daily_logs dl WHERE dl.user_id = target_user), '[]'::json),
    'supplement_logs', COALESCE((SELECT json_agg(sl ORDER BY date DESC) FROM public.supplement_logs sl WHERE sl.user_id = target_user), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;
