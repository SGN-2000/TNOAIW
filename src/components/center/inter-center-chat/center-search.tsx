"use client"

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, MessageSquare, Building2, School, GraduationCap, MapPin } from "lucide-react";
import type { CenterProfile } from "./types";
import { getDistricts } from "@/ai/flows/get-districts-flow";

const countries = [
    "Todos", "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba", 
    "Ecuador", "El Salvador", "España", "Guatemala", "Honduras", "México", 
    "Nicaragua", "Paraguay", "Perú", "Puerto Rico", "República Dominicana", 
    "Uruguay", "Venezuela"
];

const provinces: { [key: string]: string[] } = {
    "Argentina": ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego, Antártida e Islas del Atlántico Sur", "Tucumán", "Ciudad Autónoma de Buenos Aires"],
};
const educationLevels = ["Todos", "Primario", "Secundario", "Terciario", "Universitario", "Otro"];

interface CenterSearchProps {
    allCenters: CenterProfile[];
    currentCenterId: string;
    onStartChat: (targetCenter: CenterProfile) => void;
}

export default function CenterSearch({ allCenters, currentCenterId, onStartChat }: CenterSearchProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        country: "Todos",
        province: "Todos",
        district: "Todos",
        educationLevel: "Todos"
    });
    const [districts, setDistricts] = useState<string[]>([]);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

    useState(() => {
        if (filters.country !== "Todos" && filters.country && filters.province !== "Todos" && filters.province) {
            setIsLoadingDistricts(true);
            setDistricts([]);
            setFilters(f => ({ ...f, district: "Todos" }));
            
            getDistricts({ country: filters.country, province: filters.province })
                .then(result => setDistricts(result))
                .catch(console.error)
                .finally(() => setIsLoadingDistricts(false));
        } else {
            setDistricts([]);
        }
    });
    
    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'country') {
                newFilters.province = 'Todos';
                newFilters.district = 'Todos';
            }
            if (filterName === 'province') {
                newFilters.district = 'Todos';
            }
            return newFilters;
        });
    };

    const filteredCenters = useMemo(() => {
        return allCenters.filter(center => {
            if (center.id === currentCenterId) return false;
            const searchMatch = center.centerName.toLowerCase().includes(searchTerm.toLowerCase());
            const countryMatch = filters.country === 'Todos' || center.country === filters.country;
            const provinceMatch = filters.province === 'Todos' || center.province === filters.province;
            const districtMatch = filters.district === 'Todos' || center.district === filters.district;
            const levelMatch = filters.educationLevel === 'Todos' || center.educationLevel === filters.educationLevel;
            return searchMatch && countryMatch && provinceMatch && districtMatch && levelMatch;
        });
    }, [allCenters, searchTerm, filters, currentCenterId]);
    
    const availableProvinces = filters.country !== "Todos" ? provinces[filters.country]?.sort() || [] : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search />Buscar Centros</CardTitle>
                <CardDescription>Encuentra otros centros para iniciar una conversación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input 
                    placeholder="Buscar por nombre del centro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select value={filters.country} onValueChange={(v) => handleFilterChange('country', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filters.province} onValueChange={(v) => handleFilterChange('province', v)} disabled={filters.country === 'Todos'}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Todas</SelectItem>
                            {availableProvinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filters.district} onValueChange={(v) => handleFilterChange('district', v)} disabled={filters.province === 'Todos' || isLoadingDistricts}>
                        <SelectTrigger>
                            {isLoadingDistricts ? <Loader2 className="animate-spin h-4 w-4"/> : <SelectValue/>}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Todos</SelectItem>
                            {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filters.educationLevel} onValueChange={(v) => handleFilterChange('educationLevel', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                             {educationLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3 pt-4 pr-2">
                    {allCenters.length === 0 ? <div className="flex justify-center"><Loader2 className="animate-spin"/></div> :
                     filteredCenters.length > 0 ? filteredCenters.map(center => (
                         <Card key={center.id} className="shadow-sm">
                             <CardContent className="p-4 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="font-bold flex items-center gap-2"><Building2 className="h-4 w-4"/>{center.centerName}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2"><School className="h-4 w-4"/>{center.schoolName}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{center.district}, {center.province}</span>
                                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3"/>{center.educationLevel}</span>
                                    </div>
                                </div>
                                 <Button variant="outline" size="sm" onClick={() => onStartChat(center)}>
                                     <MessageSquare className="mr-2 h-4 w-4"/> Iniciar Chat
                                 </Button>
                             </CardContent>
                         </Card>
                     )) : <p className="text-center text-muted-foreground py-8">No se encontraron centros.</p>}
                </div>
            </CardContent>
        </Card>
    );
}
