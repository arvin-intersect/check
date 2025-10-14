import { SignUp } from "@clerk/clerk-react";

const SignUpPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
  </div>
);

export default SignUpPage;