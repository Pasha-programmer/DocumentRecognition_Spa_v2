import { IKeyValuePair } from "../Interfaces/IKeyValuePair";
import { DateOnly, DateTimeOffset } from "./DateExt";

export class RouteParams {

    static generateRouteParams<TValue>(params: Record<string, TValue>) {
        const paramList = RouteParams.generateRouteParamList<TValue>(params)

        return paramList.join('&');
    }

    static generateRouteParamList<TValue>(params: Record<string, TValue>) {
        const result: string[] = [];
        for (const key in params) {
            if (params[key] === undefined || params[key] === null)
                continue;

            const value = params[key];
            if (Array.isArray(value)) {
                value.forEach((item) => {
                    result.push(`${key}=${item}`);
                });
                continue;
            }

            if (value instanceof DateTimeOffset) {
                result.push(`${key}=${(value as DateTimeOffset).toJSON()}`);
                continue;
            }

            if (value instanceof DateOnly) {
                result.push(`${key}=${(value as DateOnly).toJSON()}`);
                continue;
            }

            if (value instanceof Date) {
                result.push(`${key}=${value.toJSON()}`);
                continue;
            }

            if ((typeof value) === 'object') {
                //TODO check it!
                const innerResult = RouteParams.generateRouteParamList<any>((value as any).entries())
                result.push(...innerResult);
                continue;
            }

            result.push(`${key}=${value}`);
        }
        return result;
    }

    static parseRouteHash(hash: string): IKeyValuePair<string>[] {
        const params = new URLSearchParams(hash);

        const pairs: IKeyValuePair<string>[] = [];

        [...params.entries()].forEach((element: string[]) => {
            if (element[0].charAt(0) == '#')
                element[0] = element[0].slice(1)
            pairs.push({ key: element[0], value: element[1] })
        });

        return pairs;
    }
}