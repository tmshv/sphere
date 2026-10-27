import { Skeleton } from "./Skeleton"
import { visualCases } from "../visual/visualCases"

visualCases("InternalSkeleton", {
    "full-width": { render: () => <Skeleton height={16} /> },
    "fixed-width": { render: () => <Skeleton height={12} width={120} /> },
    "percent-width": { render: () => <Skeleton height={20} width="50%" /> },
})
