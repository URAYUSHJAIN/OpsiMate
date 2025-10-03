import { Request, Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@OpsiMate/shared';

export class VersionController {
    private logger = new Logger('VersionController');
    
    public getVersionHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // Try to read the root package.json first (monorepo root)
            let packageJsonPath = join(process.cwd(), '..', '..', 'package.json');
            if (!existsSync(packageJsonPath)) {
                // Fallback to current directory package.json
                packageJsonPath = join(process.cwd(), 'package.json');
            }
            
            let packageData: { version: string; name: string; } = { version: '1.0.0', name: 'OpsiMate' };
            
            if (existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
                packageData = {
                    version: packageJson.version || '1.0.0',
                    name: packageJson.name || 'OpsiMate'
                };
            } else {
                this.logger.warn('Could not find package.json, using fallback version');
            }
            
            // Use build date if available from environment, otherwise use current date
            const buildDate = process.env.BUILD_DATE || new Date().toISOString();
            
            res.json({
                success: true,
                data: {
                    version: packageData.version,
                    name: packageData.name,
                    buildDate
                }
            });
        } catch (error) {
            this.logger.error('Error getting version info:', error);
            
            // Even if there's an error, we still return a valid response with fallback data
            res.json({
                success: true,
                data: {
                    version: '1.0.0',
                    name: 'OpsiMate',
                    buildDate: new Date().toISOString()
                }
            });
        }
    }
}