import logger from "@/logger"

export function fireAndLog(task: () => Promise<unknown>, message: string): () => void {
    return () => {
        task().catch(err => {
            logger.error(`${message}: %s`, err)
        })
    }
}
