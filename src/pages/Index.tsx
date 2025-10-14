// src/pages/Index.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, LineChart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
// CORRECTED: Import SignedIn and SignedOut instead of useUser
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Intersect Discovery</h1>
            {/* CORRECTED: Use components to show the right button based on auth state */}
            <SignedIn>
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            </SignedIn>
            <SignedOut>
              <Button onClick={() => navigate("/sign-in")}>Sign In</Button>
            </SignedOut>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              AI-Powered Client Discovery
            </div>
            
            <h1 className="text-5xl font-semibold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Create questionnaires that understand your clients
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Design sectioned questionnaires, publish secure forms, and collect answers to your questions. A product of Intersect AI.
            </p>

            <div className="flex items-center justify-center gap-4 pt-4">
              {/* CORRECTED: Use components for the main CTA button as well */}
              <SignedIn>
                <Button size="lg" className="gap-2" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignedIn>
              <SignedOut>
                <Button size="lg" className="gap-2" onClick={() => navigate("/sign-up")}>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignedOut>
              <Button size="lg" variant="outline" onClick={() => navigate("/form/demo")}>
                View Sample Form
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Structured Collection
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Create multi-section questionnaires with various question types and branching logic
              </p>
            </div>
            <div className="space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <LineChart className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                AI Analysis
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically generate executive summaries, insights, and workshop packs from responses
              </p>
            </div>
            <div className="space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Team Collaboration
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Enable multiple stakeholders to contribute with role-based access and real-time updates
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-24">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Intersect Discovery. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;