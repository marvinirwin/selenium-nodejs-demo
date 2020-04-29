import {useState} from "react";
import {Observable} from "rxjs";

export const useObservable = <T>(s: Observable<T>, init: T | undefined) => {
    const [v, setV] = useState(init);

    s.subscribe(v => setV(v));

    return [v, setV];
};
