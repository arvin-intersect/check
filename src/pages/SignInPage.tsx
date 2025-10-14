import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <SignIn 
      path="/sign-in" 
      routing="path" 
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
    />
  </div>
);

export default SignInPage;
