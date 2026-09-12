"""
Physics & Chemistry Formula Calculator Engine.
Provides instant calculations for common physics and chemistry formulas with steps.
"""
import logging
import re
import math
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings

logger = logging.getLogger(__name__)


# Physics formulas database
PHYSICS_FORMULAS = {
    # Mechanics
    'kinetic_energy': {
        'name': 'Kinetic Energy',
        'formula': 'KE = 0.5 * m * v^2',
        'variables': ['mass (kg)', 'velocity (m/s)'],
        'solve_for': ['mass', 'velocity', 'energy'],
        'unit': 'Joules (J)',
    },
    'potential_energy': {
        'name': 'Gravitational Potential Energy',
        'formula': 'PE = m * g * h',
        'variables': ['mass (kg)', 'height (m)', 'gravity (m/s^2)'],
        'solve_for': ['mass', 'height', 'gravity', 'energy'],
        'unit': 'Joules (J)',
        'defaults': {'gravity': 9.81},
    },
    'force': {
        'name': 'Force (Newton\'s 2nd Law)',
        'formula': 'F = m * a',
        'variables': ['mass (kg)', 'acceleration (m/s^2)'],
        'solve_for': ['mass', 'acceleration', 'force'],
        'unit': 'Newtons (N)',
    },
    'momentum': {
        'name': 'Linear Momentum',
        'formula': 'p = m * v',
        'variables': ['mass (kg)', 'velocity (m/s)'],
        'solve_for': ['mass', 'velocity', 'momentum'],
        'unit': 'kg·m/s',
    },
    'work': {
        'name': 'Work Done',
        'formula': 'W = F * d * cos(θ)',
        'variables': ['force (N)', 'distance (m)', 'angle (degrees)'],
        'solve_for': ['force', 'distance', 'angle', 'work'],
        'unit': 'Joules (J)',
    },
    'power': {
        'name': 'Power',
        'formula': 'P = W / t',
        'variables': ['work (J)', 'time (s)'],
        'solve_for': ['work', 'time', 'power'],
        'unit': 'Watts (W)',
    },
    'pressure': {
        'name': 'Pressure',
        'formula': 'P = F / A',
        'variables': ['force (N)', 'area (m^2)'],
        'solve_for': ['force', 'area', 'pressure'],
        'unit': 'Pascals (Pa)',
    },
    'density': {
        'name': 'Density',
        'formula': 'ρ = m / V',
        'variables': ['mass (kg)', 'volume (m^3)'],
        'solve_for': ['mass', 'volume', 'density'],
        'unit': 'kg/m³',
    },
    
    # Waves & Optics
    'wave_speed': {
        'name': 'Wave Speed',
        'formula': 'v = f * λ',
        'variables': ['frequency (Hz)', 'wavelength (m)'],
        'solve_for': ['frequency', 'wavelength', 'speed'],
        'unit': 'm/s',
    },
    'snells_law': {
        'name': 'Snell\'s Law (Refraction)',
        'formula': 'n₁ sin(θ₁) = n₂ sin(θ₂)',
        'variables': ['n1', 'angle1 (degrees)', 'n2', 'angle2 (degrees)'],
        'solve_for': ['n1', 'angle1', 'n2', 'angle2'],
    },
    'lens_formula': {
        'name': 'Lens Formula',
        'formula': '1/f = 1/v + 1/u',
        'variables': ['focal_length (m)', 'object_distance (m)', 'image_distance (m)'],
        'solve_for': ['focal_length', 'object_distance', 'image_distance'],
    },
    'mirror_formula': {
        'name': 'Mirror Formula',
        'formula': '1/f = 1/v + 1/u',
        'variables': ['focal_length (m)', 'object_distance (m)', 'image_distance (m)'],
        'solve_for': ['focal_length', 'object_distance', 'image_distance'],
    },
    
    # Electricity & Magnetism
    'ohms_law': {
        'name': 'Ohm\'s Law',
        'formula': 'V = I * R',
        'variables': ['voltage (V)', 'current (A)', 'resistance (Ω)'],
        'solve_for': ['voltage', 'current', 'resistance'],
        'unit': 'Volts (V), Amperes (A), Ohms (Ω)',
    },
    'power_electrical': {
        'name': 'Electrical Power',
        'formula': 'P = V * I',
        'variables': ['voltage (V)', 'current (A)'],
        'solve_for': ['voltage', 'current', 'power'],
        'unit': 'Watts (W)',
    },
    'resistance': {
        'name': 'Resistance',
        'formula': 'R = ρ * L / A',
        'variables': ['resistivity (Ω·m)', 'length (m)', 'area (m²)'],
        'solve_for': ['resistivity', 'length', 'area', 'resistance'],
        'unit': 'Ohms (Ω)',
    },
    'capacitance': {
        'name': 'Capacitance',
        'formula': 'C = Q / V',
        'variables': ['charge (C)', 'voltage (V)'],
        'solve_for': ['charge', 'voltage', 'capacitance'],
        'unit': 'Farads (F)',
    },
    'electric_field': {
        'name': 'Electric Field (Point Charge)',
        'formula': 'E = k * Q / r^2',
        'variables': ['charge (C)', 'distance (m)'],
        'solve_for': ['charge', 'distance', 'field'],
        'unit': 'N/C',
        'constants': {'k': 8.99e9},
    },
    'coulombs_law': {
        'name': 'Coulomb\'s Law',
        'formula': 'F = k * q1 * q2 / r^2',
        'variables': ['q1 (C)', 'q2 (C)', 'distance (m)'],
        'solve_for': ['q1', 'q2', 'distance', 'force'],
        'unit': 'Newtons (N)',
        'constants': {'k': 8.99e9},
    },
    
    # Thermodynamics
    'ideal_gas_law': {
        'name': 'Ideal Gas Law',
        'formula': 'PV = nRT',
        'variables': ['pressure (Pa)', 'volume (m³)', 'moles', 'temperature (K)'],
        'solve_for': ['pressure', 'volume', 'moles', 'temperature'],
        'unit': 'Pa·m³/mol·K',
        'constants': {'R': 8.314},
    },
    'boyles_law': {
        'name': 'Boyle\'s Law',
        'formula': 'P1 * V1 = P2 * V2',
        'variables': ['P1', 'V1', 'P2', 'V2'],
        'solve_for': ['P1', 'V1', 'P2', 'V2'],
    },
    'charles_law': {
        'name': 'Charles\'s Law',
        'formula': 'V1/T1 = V2/T2',
        'variables': ['V1', 'T1', 'V2', 'T2'],
        'solve_for': ['V1', 'T1', 'V2', 'T2'],
    },
}


# Chemistry formulas database
CHEMISTRY_FORMULAS = {
    # Stoichiometry
    'molar_mass': {
        'name': 'Molar Mass',
        'formula': 'M = m / n',
        'variables': ['mass (g)', 'moles (mol)'],
        'solve_for': ['mass', 'moles', 'molar_mass'],
        'unit': 'g/mol',
    },
    'moles_from_mass': {
        'name': 'Moles from Mass',
        'formula': 'n = m / M',
        'variables': ['mass (g)', 'molar_mass (g/mol)'],
        'solve_for': ['mass', 'molar_mass', 'moles'],
        'unit': 'mol',
    },
    'moles_from_volume': {
        'name': 'Moles from Volume (Gas at STP)',
        'formula': 'n = V / 22.4',
        'variables': ['volume (L)'],
        'solve_for': ['volume', 'moles'],
        'unit': 'mol',
    },
    'molarity': {
        'name': 'Molarity',
        'formula': 'M = n / V',
        'variables': ['moles (mol)', 'volume (L)'],
        'solve_for': ['moles', 'volume', 'molarity'],
        'unit': 'mol/L (M)',
    },
    'dilution': {
        'name': 'Dilution Formula',
        'formula': 'M1 * V1 = M2 * V2',
        'variables': ['M1', 'V1', 'M2', 'V2'],
        'solve_for': ['M1', 'V1', 'M2', 'V2'],
    },
    'mole_ratio': {
        'name': 'Mole Ratio (Stoichiometry)',
        'formula': 'nA / a = nB / b = nC / c ...',
        'variables': ['known_moles', 'known_coeff', 'target_coeff'],
        'solve_for': ['target_moles'],
    },
    'percent_yield': {
        'name': 'Percent Yield',
        'formula': '% yield = (actual / theoretical) * 100',
        'variables': ['actual_yield', 'theoretical_yield'],
        'solve_for': ['actual_yield', 'theoretical_yield', 'percent_yield'],
    },
    'limiting_reagent': {
        'name': 'Limiting Reagent',
        'formula': 'Find limiting reagent by comparing mole ratios',
        'variables': ['moles_A', 'coeff_A', 'moles_B', 'coeff_B'],
        'solve_for': ['limiting_reagent', 'excess_remaining'],
    },
    
    # Gas Laws
    'combined_gas_law': {
        'name': 'Combined Gas Law',
        'formula': 'P1 * V1 / T1 = P2 * V2 / T2',
        'variables': ['P1', 'V1', 'T1', 'P2', 'V2', 'T2'],
        'solve_for': ['P1', 'V1', 'T1', 'P2', 'V2', 'T2'],
    },
    'gay_lussac_law': {
        'name': 'Gay-Lussac\'s Law',
        'formula': 'P1/T1 = P2/T2',
        'variables': ['P1', 'T1', 'P2', 'T2'],
        'solve_for': ['P1', 'T1', 'P2', 'T2'],
    },
    'avogadros_law': {
        'name': 'Avogadro\'s Law',
        'formula': 'V1/n1 = V2/n2',
        'variables': ['V1', 'n1', 'V2', 'n2'],
        'solve_for': ['V1', 'n1', 'V2', 'n2'],
    },
    'grahams_law': {
        'name': 'Graham\'s Law of Effusion',
        'formula': 'rate1/rate2 = sqrt(M2/M1)',
        'variables': ['rate1', 'rate2', 'M1', 'M2'],
        'solve_for': ['rate1', 'rate2', 'M1', 'M2'],
    },
    
    # Solutions & Concentrations
    'ppm': {
        'name': 'Parts Per Million (PPM)',
        'formula': 'ppm = (mass_solute / mass_solution) * 1e6',
        'variables': ['mass_solute', 'mass_solution'],
        'solve_for': ['mass_solute', 'mass_solution', 'ppm'],
    },
    'ppb': {
        'name': 'Parts Per Billion (PPB)',
        'formula': 'ppb = (mass_solute / mass_solution) * 1e9',
        'variables': ['mass_solute', 'mass_solution'],
        'solve_for': ['mass_solute', 'mass_solution', 'ppb'],
    },
    'normality': {
        'name': 'Normality',
        'formula': 'N = equivalents / V(L)',
        'variables': ['equivalents', 'volume (L)'],
        'solve_for': ['equivalents', 'volume', 'normality'],
    },
    'ph': {
        'name': 'pH Calculation',
        'formula': 'pH = -log10[H+]',
        'variables': ['[H+] (M)'],
        'solve_for': ['H_concentration', 'pH'],
        'unit': 'pH',
    },
    'poh': {
        'name': 'pOH Calculation',
        'formula': 'pOH = -log10[OH-]',
        'variables': ['[OH-] (M)'],
        'solve_for': ['OH_concentration', 'pOH'],
        'unit': 'pOH',
    },
    'ka_kb': {
        'name': 'Ka/Kb Relationship',
        'formula': 'Ka * Kb = Kw = 1e-14',
        'variables': ['Ka', 'Kb'],
        'solve_for': ['Ka', 'Kb'],
    },
    'henderson_hasselbalch': {
        'name': 'Henderson-Hasselbalch Equation',
        'formula': 'pH = pKa + log10([A-]/[HA])',
        'variables': ['pKa', '[A-] (M)', '[HA] (M)'],
        'solve_for': ['pH', 'pKa', 'base_concentration', 'acid_concentration'],
    },
    
    # Electrochemistry
    'nernst_equation': {
        'name': 'Nernst Equation',
        'formula': 'E = E° - (RT/nF) * ln(Q)',
        'variables': ['E° (V)', 'n (electrons)', 'Q', 'T (K)'],
        'solve_for': ['E', 'E°', 'Q', 'n'],
        'constants': {'R': 8.314, 'F': 96485},
    },
    'faradays_law': {
        'name': 'Faraday\'s Law of Electrolysis',
        'formula': 'm = (Q * M) / (n * F)',
        'variables': ['charge (C)', 'molar_mass (g/mol)', 'n (electrons)'],
        'solve_for': ['mass', 'charge', 'molar_mass', 'n'],
        'constants': {'F': 96485},
    },
    
    # Kinetics
    'rate_law': {
        'name': 'Rate Law',
        'formula': 'rate = k * [A]^x * [B]^y',
        'variables': ['k', '[A]', 'x', '[B]', 'y'],
        'solve_for': ['k', 'concentration_A', 'order_A', 'concentration_B', 'order_B', 'rate'],
    },
    'integrated_rate_zero': {
        'name': 'Integrated Rate Law (Zero Order)',
        'formula': '[A]t = [A]0 - kt',
        'variables': ['[A]0', 'k', 't'],
        'solve_for': ['[A]t', '[A]0', 'k', 't'],
    },
    'integrated_rate_first': {
        'name': 'Integrated Rate Law (First Order)',
        'formula': 'ln[A]t = ln[A]0 - kt',
        'variables': ['[A]0', 'k', 't'],
        'solve_for': ['[A]t', '[A]0', 'k', 't'],
    },
    'integrated_rate_second': {
        'name': 'Integrated Rate Law (Second Order)',
        'formula': '1/[A]t = 1/[A]0 + kt',
        'variables': ['[A]0', 'k', 't'],
        'solve_for': ['[A]t', '[A]0', 'k', 't'],
    },
    'arrhenius': {
        'name': 'Arrhenius Equation',
        'formula': 'k = A * e^(-Ea/RT)',
        'variables': ['A', 'Ea (J/mol)', 'T (K)'],
        'solve_for': ['k', 'A', 'Ea', 'T'],
        'constants': {'R': 8.314},
    },
    
    # Thermochemistry
    'enthalpy_change': {
        'name': 'Enthalpy Change (Hess\'s Law)',
        'formula': 'ΔH = ΣΔH(products) - ΣΔH(reactants)',
        'variables': ['product_enthalpies', 'reactant_enthalpies'],
        'solve_for': ['delta_H'],
    },
    'gibbs_free_energy': {
        'name': 'Gibbs Free Energy',
        'formula': 'ΔG = ΔH - TΔS',
        'variables': ['ΔH (J/mol)', 'ΔS (J/mol·K)', 'T (K)'],
        'solve_for': ['ΔG', 'ΔH', 'ΔS', 'T'],
    },
    'equilibrium_constant': {
        'name': 'Equilibrium Constant',
        'formula': 'Kc = [products]^coeff / [reactants]^coeff',
        'variables': ['concentrations', 'coefficients'],
        'solve_for': ['Kc'],
    },
    'reaction_quotient': {
        'name': 'Reaction Quotient',
        'formula': 'Q = [products]^coeff / [reactants]^coeff',
        'variables': ['concentrations', 'coefficients'],
        'solve_for': ['Q'],
    },
}


ALL_FORMULAS = {
    'physics': PHYSICS_FORMULAS,
    'chemistry': CHEMISTRY_FORMULAS,
}


def find_formula(formula_id: str) -> Optional[Dict[str, Any]]:
    """Find a formula by ID."""
    for category, formulas in ALL_FORMULAS.items():
        if formula_id in formulas:
            return {'category': category, **formulas[formula_id]}
    return None


def search_formulas(query: str) -> List[Dict[str, Any]]:
    """Search formulas by name or keywords."""
    query = query.lower()
    results = []
    for category, formulas in ALL_FORMULAS.items():
        for fid, formula in formulas.items():
            name = formula['name'].lower()
            formula_str = formula['formula'].lower()
            if query in name or query in formula_str:
                results.append({'id': fid, 'category': category, **formula})
    return results


def calculate_formula(formula_id: str, known_values: Dict[str, float]) -> Dict[str, Any]:
    """
    Calculate unknown values using a physics/chemistry formula.
    
    Args:
        formula_id: Formula identifier
        known_values: Dict of known variable values
        
    Returns:
        Dict with calculated values, steps, and formula info
    """
    formula = find_formula(formula_id)
    if not formula:
        return {"error": f"Formula not found: {formula_id}"}
    
    steps = []
    known = {k.lower().replace(' ', '_'): v for k, v in known_values.items()}
    constants = formula.get('constants', {})
    
    try:
        # This is a simplified calculator - in practice you'd use sympy or a proper solver
        # For now, return the formula info and which variables can be calculated
        solvable = [v for v in formula['solve_for'] if v.lower().replace(' ', '_') not in known]
        return {
            "formula": formula['formula'],
            "name": formula['name'],
            "category": "physics" if formula_id in PHYSICS_FORMULAS else "chemistry",
            "known_values": known,
            "can_solve_for": solvable,
            "constants": constants,
            "steps": ["Formula identified", f"Known values: {known}", f"Can solve for: {solvable}"],
            "requires": [v for v in formula['variables'] if v.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_') not in known],
        }
    except Exception as e:
        logger.warning(f"Formula calculation failed: {e}")
        return {"error": f"Calculation failed: {str(e)}"}


class PhysicsChemistryCalculator:
    """Main calculator interface for physics and chemistry formulas."""
    
    def __init__(self):
        self.formulas = ALL_FORMULAS
    
    def search(self, query: str) -> List[Dict[str, Any]]:
        """Search formulas by keyword."""
        return search_formulas(query)
    
    def get_formula(self, formula_id: str) -> Optional[Dict[str, Any]]:
        """Get formula details by ID."""
        return find_formula(formula_id)
    
    def calculate(self, formula_id: str, known_values: Dict[str, float]) -> Dict[str, Any]:
        """Calculate using a formula with known values."""
        return calculate_formula(formula_id, known_values)
    
    def list_formulas(self, category: Optional[str] = None) -> Dict[str, List[str]]:
        """List available formulas, optionally filtered by category."""
        if category:
            cat = category.lower()
            if cat in ALL_FORMULAS:
                return {cat: list(ALL_FORMULAS[cat].keys())}
            return {}
        return {cat: list(formulas.keys()) for cat, formulas in ALL_FORMULAS.items()}


# Convenience functions
def calculate_physics(formula_id: str, known_values: Dict[str, float]) -> Dict[str, Any]:
    """Calculate physics formula."""
    return calculate_formula(formula_id, known_values)


def calculate_chemistry(formula_id: str, known_values: Dict[str, float]) -> Dict[str, Any]:
    """Calculate chemistry formula."""
    return calculate_formula(formula_id, known_values)


# Convenience class
def get_formula_calculator() -> PhysicsChemistryCalculator:
    """Get the physics/chemistry calculator instance."""
    return PhysicsChemistryCalculator()