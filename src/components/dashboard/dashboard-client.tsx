'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  DollarSign,
  Users,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type DashboardData = {
  totalTenants: number;
  totalProperties: number;
  statusCounts: {
    paid: number;
    overdue: number;
    upcoming: number;
  };
};

const chartConfig: ChartConfig = {
  paid: {
    label: 'Paid',
    color: 'hsl(var(--chart-1))',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    color: 'hsl(var(--destructive))',
    icon: AlertCircle,
  },
  upcoming: {
    label: 'Upcoming',
    color: 'hsl(var(--chart-2))',
    icon: Clock,
  },
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const chartData = [
    { name: 'paid', value: data.statusCounts.paid, fill: 'var(--color-paid)' },
    { name: 'overdue', value: data.statusCounts.overdue, fill: 'var(--color-overdue)' },
    { name: 'upcoming', value: data.statusCounts.upcoming, fill: 'var(--color-upcoming)' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalProperties}</div>
          <p className="text-xs text-muted-foreground">Managed properties</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalTenants}</div>
          <p className="text-xs text-muted-foreground">Currently active tenants</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.statusCounts.overdue}</div>
          <p className="text-xs text-muted-foreground">Tenants with late payments</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            This Month's Payment Status
          </CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[150px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} strokeWidth={2}>
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
