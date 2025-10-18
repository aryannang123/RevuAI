import { supabase } from './supabase'

// Test Supabase connection
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Connection test failed:', error)
      return { connected: false, error: error.message }
    }
    console.log('Connection test successful')
    return { connected: true, error: null }
  } catch (error) {
    console.error('Connection test error:', error)
    return { connected: false, error: error.message }
  }
}

// Sign up with email and password
export const signUpWithEmail = async (email, password, username) => {
  try {
    console.log('Attempting to sign up with Supabase...')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    })
    
    if (error) {
      console.error('Supabase signup error:', error)
      throw error
    }
    console.log('Sign up successful:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Signup function error:', error)
    return { data: null, error: error.message }
  }
}

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    // Test connection first
    console.log('Attempting to sign in with Supabase...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Supabase auth error:', error)
      throw error
    }
    console.log('Sign in successful:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Auth function error:', error)
    return { data: null, error: error.message }
  }
}

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message }
  }
}

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error.message }
  }
}

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

// Resend confirmation email
export const resendConfirmation = async (email) => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error: error.message }
  }
}