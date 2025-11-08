// apps/web/components/customers/customer-stats-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Assuming formatCurrency and getSegmentVariant are defined in a utils file
import { formatCurrency, getSegmentVariant } from '@/lib/utils';

// Define the shape of the customer data expected by this component
interface CustomerStats {
  _count?: {
    orders: number;
  };
  totalSpent: number;
  debt: number;
  segment: string;
}

interface CustomerStatsCardsProps {
  stats: CustomerStats;
}

const CustomerStatsCards = ({ stats }: CustomerStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tổng đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats._count?.orders || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tổng chi tiêu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalSpent)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Công nợ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${stats.debt > 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(stats.debt)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Phân khúc</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={getSegmentVariant(stats.segment)}>
            {stats.segment}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerStatsCards;
