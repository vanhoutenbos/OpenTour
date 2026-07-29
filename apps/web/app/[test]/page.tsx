export default function DynamicTestPage({ params }: { params: { test: string } }) {
  return <div>Dynamic test: {params.test}</div>;
}
