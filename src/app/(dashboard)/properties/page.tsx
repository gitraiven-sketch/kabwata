import { PropertyList } from '@/components/properties/property-list';

export default async function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          View and manage all properties in the complex.
        </p>
      </div>
      <PropertyList properties={[]} />
    </div>
  );
}
