"""
Unit Conversion Engine - Handles various unit conversions with step-by-step explanations.
"""
import logging
import re
from typing import Any, Dict, List, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)


# Conversion factors to base units
LENGTH_CONVERSIONS = {
    'meter': 1.0,
    'meters': 1.0,
    'metre': 1.0,
    'metres': 1.0,
    'm': 1.0,
    'kilometer': 1000.0,
    'kilometers': 1000.0,
    'kilometre': 1000.0,
    'kilometres': 1000.0,
    'km': 1000.0,
    'centimeter': 0.01,
    'centimeters': 0.01,
    'centimetre': 0.01,
    'centimetres': 0.01,
    'cm': 0.01,
    'millimeter': 0.001,
    'millimeters': 0.001,
    'millimetre': 0.001,
    'millimetres': 0.001,
    'mm': 0.001,
    'micrometer': 1e-6,
    'micrometers': 1e-6,
    'micrometre': 1e-6,
    'micrometres': 1e-6,
    'micron': 1e-6,
    'microns': 1e-6,
    'nanometer': 1e-9,
    'nanometers': 1e-9,
    'nanometre': 1e-9,
    'nanometres': 1e-9,
    'nm': 1e-9,
    'inch': 0.0254,
    'inches': 0.0254,
    'in': 0.0254,
    'foot': 0.3048,
    'feet': 0.3048,
    'ft': 0.3048,
    'yard': 0.9144,
    'yards': 0.9144,
    'yd': 0.9144,
    'mile': 1609.344,
    'miles': 1609.344,
    'mi': 1609.344,
    'nautical_mile': 1852.0,
    'nautical_miles': 1852.0,
    'nmi': 1852.0,
    'light_year': 9.461e15,
    'light_years': 9.461e15,
    'ly': 9.461e15,
    'parsec': 3.086e16,
    'parsecs': 3.086e16,
    'angstrom': 1e-10,
    'angstroms': 1e-10,
    'fermi': 1e-15,
    'fermis': 1e-15,
}

MASS_CONVERSIONS = {
    'kilogram': 1.0,
    'kilograms': 1.0,
    'kg': 1.0,
    'gram': 0.001,
    'grams': 0.001,
    'g': 0.001,
    'milligram': 1e-6,
    'milligrams': 1e-6,
    'mg': 1e-6,
    'microgram': 1e-9,
    'micrograms': 1e-9,
    'mcg': 1e-9,
    'tonne': 1000.0,
    'tonnes': 1000.0,
    'metric_ton': 1000.0,
    'metric_tons': 1000.0,
    'ton': 1000.0,
    'tons': 1000.0,
    'pound': 0.45359237,
    'pounds': 0.45359237,
    'lb': 0.45359237,
    'lbs': 0.45359237,
    'ounce': 0.028349523125,
    'ounces': 0.028349523125,
    'oz': 0.028349523125,
    'stone': 6.35029318,
    'stones': 6.35029318,
    'carat': 0.0002,
    'carats': 0.0002,
    'atomic_mass_unit': 1.66053906660e-27,
    'amu': 1.66053906660e-27,
}

VOLUME_CONVERSIONS = {
    'cubic_meter': 1.0,
    'cubic_meters': 1.0,
    'm3': 1.0,
    'liter': 0.001,
    'liters': 0.001,
    'litre': 0.001,
    'litres': 0.001,
    'l': 0.001,
    'milliliter': 1e-6,
    'milliliters': 1e-6,
    'millilitre': 1e-6,
    'millilitres': 1e-6,
    'ml': 1e-6,
    'cubic_centimeter': 1e-6,
    'cubic_centimeters': 1e-6,
    'cc': 1e-6,
    'gallon': 0.00378541,
    'gallons': 0.00378541,
    'gal': 0.00378541,
    'quart': 0.000946353,
    'quarts': 0.000946353,
    'qt': 0.000946353,
    'pint': 0.000473176,
    'pints': 0.000473176,
    'pt': 0.000473176,
    'cup': 0.000236588,
    'cups': 0.000236588,
    'fluid_ounce': 2.95735e-5,
    'fluid_ounces': 2.95735e-5,
    'fl_oz': 2.95735e-5,
    'tablespoon': 1.47868e-5,
    'tablespoons': 1.47868e-5,
    'tbsp': 1.47868e-5,
    'teaspoon': 4.92892e-6,
    'teaspoons': 4.92892e-6,
    'tsp': 4.92892e-6,
    'cubic_inch': 1.63871e-5,
    'cubic_inches': 1.63871e-5,
    'cubic_foot': 0.0283168,
    'cubic_feet': 0.0283168,
    'cubic_yard': 0.764555,
    'cubic_yards': 0.764555,
}

TEMPERATURE_CONVERSIONS = {
    'celsius': ('celsius', lambda c: c, lambda c: c),
    'c': ('celsius', lambda c: c, lambda c: c),
    'fahrenheit': ('fahrenheit', lambda f: (f - 32) * 5/9, lambda c: c * 9/5 + 32),
    'f': ('fahrenheit', lambda f: (f - 32) * 5/9, lambda c: c * 9/5 + 32),
    'kelvin': ('kelvin', lambda k: k - 273.15, lambda c: c + 273.15),
    'k': ('kelvin', lambda k: k - 273.15, lambda c: c + 273.15),
    'rankine': ('rankine', lambda r: (r - 491.67) * 5/9, lambda c: c * 9/5 + 491.67),
    're': ('reaumur', lambda re: re * 5/4, lambda c: c * 4/5),
}

SPEED_CONVERSIONS = {
    'meter_per_second': 1.0,
    'm/s': 1.0,
    'mps': 1.0,
    'kilometer_per_hour': 1/3.6,
    'km/h': 1/3.6,
    'kmh': 1/3.6,
    'kph': 1/3.6,
    'mile_per_hour': 0.44704,
    'mph': 0.44704,
    'knot': 0.514444,
    'kn': 0.514444,
    'foot_per_second': 0.3048,
    'ft/s': 0.3048,
    'fps': 0.3048,
    'mach': 340.29,
}

ENERGY_CONVERSIONS = {
    'joule': 1.0,
    'j': 1.0,
    'kilojoule': 1000.0,
    'kj': 1000.0,
    'calorie': 4.184,
    'cal': 4.184,
    'kilocalorie': 4184.0,
    'kcal': 4184.0,
    'btu': 1055.06,
    'electronvolt': 1.602176634e-19,
    'ev': 1.602176634e-19,
    'kilowatt_hour': 3.6e6,
    'kwh': 3.6e6,
    'therm': 1.05506e8,
}

PRESSURE_CONVERSIONS = {
    'pascal': 1.0,
    'pa': 1.0,
    'kilopascal': 1000.0,
    'kpa': 1000.0,
    'megapascal': 1e6,
    'mpa': 1e6,
    'bar': 100000.0,
    'atmosphere': 101325.0,
    'atm': 101325.0,
    'psi': 6894.76,
    'torr': 133.322,
    'mmhg': 133.322,
}


ALL_CONVERSIONS = {
    'length': LENGTH_CONVERSIONS,
    'mass': MASS_CONVERSIONS,
    'volume': VOLUME_CONVERSIONS,
    'temperature': TEMPERATURE_CONVERSIONS,
    'speed': SPEED_CONVERSIONS,
    'energy': ENERGY_CONVERSIONS,
    'pressure': PRESSURE_CONVERSIONS,
}


def find_unit_category(unit: str) -> Optional[str]:
    """Find which category a unit belongs to."""
    unit_lower = unit.lower().strip()
    for category, conversions in ALL_CONVERSIONS.items():
        if unit_lower in conversions:
            return category
    return None


def convert_units(value: float, from_unit: str, to_unit: str) -> Dict[str, Any]:
    """
    Convert between units with step-by-step explanation.
    
    Returns:
        dict with 'result', 'steps', 'from_unit', 'to_unit', 'category'
    """
    from_unit = from_unit.lower().strip()
    to_unit = to_unit.lower().strip()
    
    category = find_unit_category(from_unit)
    if not category:
        return {"error": f"Unknown unit: {from_unit}"}
    
    if to_unit not in ALL_CONVERSIONS[category]:
        return {"error": f"Cannot convert {from_unit} to {to_unit} (different categories or unknown unit)"}
    
    steps = []
    
    # Special handling for temperature
    if category == 'temperature':
        from_info = TEMPERATURE_CONVERSIONS[from_unit]
        to_info = TEMPERATURE_CONVERSIONS[to_unit]
        
        from_base_name, to_base, from_base = from_info
        to_base_name, _, to_from_base = to_info
        
        # Convert to celsius first
        if from_base_name != 'celsius':
            celsius = to_base(value)
            steps.append(f"Convert {value} {from_unit} to Celsius: {celsius:.2f} °C")
        else:
            celsius = value
        
        # Convert from celsius to target
        if to_info[0] != 'celsius':
            result = to_info[2](celsius)
            steps.append(f"Convert {celsius:.2f} °C to {to_unit}: {result:.4f} {to_unit}")
        else:
            result = celsius
            steps.append(f"Result: {result:.2f} °C")
        
        return {
            "result": result,
            "steps": steps,
            "from_unit": from_unit,
            "to_unit": to_unit,
            "category": category,
        }
    
    # Standard linear conversion
    from_factor = ALL_CONVERSIONS[category][from_unit]
    to_factor = ALL_CONVERSIONS[category][to_unit]
    
    # Convert to base unit
    base_value = value * from_factor
    steps.append(f"Convert {value} {from_unit} to base unit: {base_value} {category} (base)")
    
    # Convert from base to target
    result = base_value / to_factor
    steps.append(f"Convert from base to {to_unit}: {result} {to_unit}")
    
    return {
        "result": result,
        "steps": steps,
        "from_unit": from_unit,
        "to_unit": to_unit,
        "category": category,
    }


def parse_conversion_query(question: str) -> Optional[Dict[str, Any]]:
    """Parse natural language conversion query."""
    # Patterns: "convert 5 meters to feet", "how many feet in 5 meters", "5 m to ft"
    # Allow units with slashes, hyphens, dots
    unit_pattern = r'[\w\./\-]+'
    patterns = [
        rf'convert\s+([\d\.]+)\s*({unit_pattern})\s+to\s+({unit_pattern})',
        rf'how many\s+({unit_pattern})\s+in\s+([\d\.]+)\s*({unit_pattern})',
        rf'([\d\.]+)\s*({unit_pattern})\s+to\s+({unit_pattern})',
        rf'([\d\.]+)\s*({unit_pattern})\s+in\s+({unit_pattern})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 3:
                if 'how many' in pattern:
                    value = float(groups[1])
                    from_unit = groups[2]
                    to_unit = groups[0]
                else:
                    value = float(groups[0])
                    from_unit = groups[1]
                    to_unit = groups[2]
                return {"value": value, "from_unit": from_unit, "to_unit": to_unit}
    return None


class UnitConverter:
    """Main unit conversion interface."""
    
    def convert(self, question: str) -> Dict[str, Any]:
        """Convert units from natural language question."""
        parsed = parse_conversion_query(question)
        if not parsed:
            return {"error": "Could not parse conversion query. Try: 'convert 5 meters to feet' or '5 m to ft'"}
        
        return convert_units(parsed["value"], parsed["from_unit"], parsed["to_unit"])
    
    def convert_direct(self, value: float, from_unit: str, to_unit: str) -> Dict[str, Any]:
        """Direct conversion with explicit units."""
        return convert_units(value, from_unit, to_unit)
    
    def list_units(self, category: Optional[str] = None) -> Dict[str, List[str]]:
        """List available units, optionally filtered by category."""
        if category:
            cat = category.lower()
            if cat in ALL_CONVERSIONS:
                return {cat: list(ALL_CONVERSIONS[cat].keys())}
            return {}
        return {cat: list(units.keys()) for cat, units in ALL_CONVERSIONS.items()}


# Convenience function
def convert_units_direct(value: float, from_unit: str, to_unit: str) -> Dict[str, Any]:
    """Direct unit conversion."""
    return convert_units(value, from_unit, to_unit)