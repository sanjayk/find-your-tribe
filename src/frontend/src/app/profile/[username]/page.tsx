interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16">
      <h1 className="mb-4 font-serif text-4xl text-ink">Profile</h1>
      <p className="text-ink-secondary">Coming soon.</p>
    </div>
  );
}
