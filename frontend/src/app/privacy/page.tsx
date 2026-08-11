import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — A&GS AI Marketing",
  description: "Privacy Policy for the A&GS AI Marketing LinkedIn content generation app.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Privacy Policy</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Last updated: August 11, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">What this app does</h2>
          <p className="mt-2">
            A&amp;GS AI Marketing is a prototype that helps generate LinkedIn post content from a
            campaign objective you provide. You enter an objective (e.g. &ldquo;Announce our AI
            security proxy guardrails&rdquo;), and the app uses AI to draft a suggested LinkedIn post
            &mdash; including a hook, body text, call to action, and hashtags &mdash; for you to review,
            edit, and optionally copy or approve before posting it yourself.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Data we collect today</h2>
          <p className="mt-2">Currently, the only data this app processes is:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>The campaign objective text you type into the form.</li>
            <li>
              Any image you optionally upload for local preview purposes (this stays in your browser
              and is never sent to our servers).
            </li>
          </ul>
          <p className="mt-2">
            We do not require account creation, do not use tracking cookies or analytics, and do not
            currently access, request, or store any LinkedIn account data. Generated drafts are held
            in server memory for the duration of your session and are not persisted to a database.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Third-party processors</h2>
          <p className="mt-2">Your campaign objective text is sent to the following services solely to generate the draft post:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Google Gemini API</strong> &mdash; processes your objective text to generate the
              strategy and post content. See{" "}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&rsquo;s Gemini API terms
              </a>
              .
            </li>
            <li>
              <strong>Render</strong> &mdash; hosts the backend API that relays requests to Gemini.
            </li>
            <li>
              <strong>Vercel</strong> &mdash; hosts this frontend application.
            </li>
          </ul>
          <p className="mt-2">We do not sell your data or share it with any other third party.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Planned LinkedIn integration
          </h2>
          <p className="mt-2">
            A future version of this app is planned to let you publish an approved draft directly to
            LinkedIn on your behalf, using LinkedIn&rsquo;s official OAuth 2.0 sign-in. When that
            feature ships:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              We will request only the minimum LinkedIn permissions needed: <code>openid</code>,{" "}
              <code>profile</code>, and <code>email</code> to identify your LinkedIn account, and{" "}
              <code>w_member_social</code> to publish a post on your behalf.
            </li>
            <li>
              We will never post to your LinkedIn account automatically. Publishing only happens when
              you explicitly click &ldquo;Approve &amp; Publish&rdquo; on a specific draft you&rsquo;ve
              reviewed.
            </li>
            <li>
              We will not read your existing LinkedIn posts, connections, messages, or any other
              LinkedIn data beyond what&rsquo;s required to identify your account and publish the post
              you approved.
            </li>
            <li>
              You can revoke this app&rsquo;s access at any time from your LinkedIn account&rsquo;s{" "}
              <a
                href="https://www.linkedin.com/psettings/permitted-services"
                className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Permitted Services
              </a>{" "}
              settings.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Data retention</h2>
          <p className="mt-2">
            Draft posts exist only in server memory while the backend process is running and are
            cleared on restart. We do not currently retain campaign objectives, generated drafts, or
            (once implemented) LinkedIn access tokens in any persistent database.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Changes to this policy</h2>
          <p className="mt-2">
            As this app moves from prototype to a version with real LinkedIn publishing, this policy
            will be updated to reflect exactly what data is stored and for how long. The &ldquo;Last
            updated&rdquo; date above will always reflect the latest revision.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data can be sent to{" "}
            <a
              href="mailto:narendra.adp@gmail.com"
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
            >
              narendra.adp@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <a href="/" className="mt-10 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
        ← Back to A&amp;GS AI Marketing
      </a>
    </div>
  );
}
