"use client";
import { supabase } from "@/lib/supabase/client";


const Login = () => {
    const login = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'http://localhost:3000/auth/callback' // Where users go after login
            }
        });
    };
    return <button onClick={() => login()}>click to login :)</button>
}

export default Login