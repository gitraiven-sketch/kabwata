'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TenantWithDetails } from '@/lib/types';
import { DayContentProps, DayPicker } from 'react-day-picker';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

type TenantCalendarProps = {
  tenants: TenantWithDetails[];
};

export function TenantCalendar({ tenants }: TenantCalendarProps) {
  const [month, setMonth] = React.useState(new Date());

  const tenantsByDay = React.useMemo(() => {
    const map = new Map<number, TenantWithDetails[]>();
    tenants.forEach(tenant => {
      const day = tenant.paymentDay;
      if (!map.has(day)) {
        map.set(day, []);
      }
      map.get(day)?.push(tenant);
    });
    return map;
  }, [tenants]);

  const modifiers = {
    due: Array.from(tenantsByDay.keys()).map(day => {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      return date;
    }),
  };

  const modifiersStyles = {
    due: { 
        fontWeight: 'bold', 
        color: 'var(--primary-foreground)',
        backgroundColor: 'hsl(var(--primary) / 0.5)',
        borderRadius: '9999px',
    },
  };

  function CustomDayContent(props: DayContentProps) {
    const dayNumber = props.date.getDate();
    const tenantsForDay = tenantsByDay.get(dayNumber);
    const isDueDay = tenantsForDay && tenantsForDay.length > 0;

    if (isDueDay && props.displayMonth === month) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative w-full h-full flex items-center justify-center">
                    <DayPicker.Day {...props} />
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                        {tenantsForDay.length}
                    </Badge>
                </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-1 text-sm">
                <p className="font-bold mb-2">Due on {format(props.date, 'do MMMM')}:</p>
                <ul className="space-y-1">
                  {tenantsForDay.map(t => (
                    <li key={t.id}>{t.name} ({t.property.name})</li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <DayPicker.Day {...props} />;
  }


  return (
    <div className="rounded-lg border">
      <Calendar
        month={month}
        onMonthChange={setMonth}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        components={{
            Day: CustomDayContent
        }}
        className="p-0"
        classNames={{
            months: "w-full",
            month: "w-full space-y-4 p-3",
            table: "w-full border-collapse",
            caption: "flex justify-center pt-1 relative items-center",
            head_row: "flex w-full mt-2",
            row: "flex w-full mt-2",
            cell: "h-12 w-12 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        }}
      />
    </div>
  );
}
